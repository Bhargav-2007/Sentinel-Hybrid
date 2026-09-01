// Gujarat Sentinel — Hybrid Gateway & Orchestrator
//
// The central API gateway that unifies all four models into a single
// entry point. Routes requests to the correct model service via
// reverse proxy and provides cross-model orchestration endpoints.
//
// Architecture:
//
//	Client → Hybrid Gateway (port 8000)
//	              ├── /api/v1/registry/*     → Model 1 (8001) — Camera Registry & GIS
//	              ├── /api/v1/streams/*       → Model 2 (8002) — Unified Viewer & ANPR
//	              ├── /api/v1/anpr/*          → Model 2 (8002) — ANPR Detections
//	              ├── /api/v1/watchlist/*     → Model 2 (8002) — Watchlist & Alerts
//	              ├── /api/v1/federation/*    → Model 3 (8003) — VMS Federation
//	              ├── /api/v1/tracking/*      → Model 4 (8004) — Vehicle Tracking
//	              ├── /api/v1/clips/*         → Model 4 (8004) — Video Clips
//	              └── /api/v1/orchestrate/*   → Cross-model operations
//
// Cross-model operations:
//   - Full vehicle lookup: plate → ANPR detections + VAHAN data + trajectory + clips
//   - Camera 360 view: camera → registry info + stream status + detections + VMS details
//   - Platform dashboard: aggregate stats from all models
package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

type GatewayConfig struct {
	Port         int
	Model1       string
	Model2       string
	Model3       string
	Model4       string
	Orchestrator string
	RedisURL     string
}

func loadConfig() *GatewayConfig {
	return &GatewayConfig{
		Port:         getEnvInt("GATEWAY_PORT", 8000),
		Model1:       getEnv("MODEL1_URL", "http://localhost:8001"),
		Model2:       getEnv("MODEL2_URL", "http://localhost:8002"),
		Model3:       getEnv("MODEL3_URL", "http://localhost:8003"),
		Model4:       getEnv("MODEL4_URL", "http://localhost:8004"),
		Orchestrator: getEnv("ORCHESTRATOR_URL", "http://localhost:8005"),
		RedisURL:     getEnv("REDIS_URL", "redis://localhost:6379/3"),
	}
}

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	sugar := logger.Sugar()

	cfg := loadConfig()
	sugar.Infow("hybrid_gateway_starting", "port", cfg.Port)

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())
	router.Use(requestLogger(sugar))

	// ── Web Dashboard (Root UI) ──────────────────────────────────────
	router.GET("/", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, dashboardHTML)
	})

	router.GET("/dashboard", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, dashboardHTML)
	})

	// ── Health ────────────────────────────────────────────────────────
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "sentinel-hybrid-gateway",
			"version": "1.0.0",
		})
	})

	router.GET("/ready", func(c *gin.Context) {
		checks := make(map[string]string)
		models := map[string]string{
			"model1": cfg.Model1,
			"model2": cfg.Model2,
			"model3": cfg.Model3,
			"model4": cfg.Model4,
		}

		allOk := true
		client := &http.Client{Timeout: 3 * time.Second}
		for name, baseURL := range models {
			healthURL := baseURL + "/health"
			if name == "model3" {
				healthURL = baseURL + "/actuator/health"
			}
			resp, err := client.Get(healthURL)
			if err != nil || resp.StatusCode != 200 {
				checks[name] = "error"
				allOk = false
			} else {
				checks[name] = "ok"
				resp.Body.Close()
			}
		}

		status := http.StatusOK
		if !allOk {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, gin.H{"ready": allOk, "models": checks})
	})

	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// ── Reverse Proxy Routes ─────────────────────────────────────────
	mountProxy := func(prefix string, target string) {
		h := reverseProxy(target, sugar)
		router.Any(prefix, h)
		router.Any(prefix+"/*path", h)
	}

	// Model 1: Camera Registry & GIS
	mountProxy("/api/v1/cameras", cfg.Orchestrator)
	mountProxy("/api/v1/gis", cfg.Model1)
	mountProxy("/api/v1/departments", cfg.Model1)
	mountProxy("/api/v1/audit", cfg.Orchestrator)

	// Orchestrator & Live Streams
	mountProxy("/api/v1/streams", cfg.Orchestrator)
	mountProxy("/api/v1/cases", cfg.Orchestrator)
	mountProxy("/api/v1/alerts", cfg.Orchestrator)
	mountProxy("/api/v1/watchlists", cfg.Orchestrator)
	mountProxy("/api/v1/auth", cfg.Orchestrator)

	// Model 2: Unified Viewer & ANPR
	mountProxy("/api/v1/anpr", cfg.Model2)
	mountProxy("/api/v1/watchlist", cfg.Model2)
	mountProxy("/api/v1/events", cfg.Model2)

	// Model 3: VMS Federation
	mountProxy("/api/v1/federation", cfg.Model3)

	// Model 4: Vehicle Tracking & Clips
	mountProxy("/api/v1/tracking", cfg.Orchestrator)
	mountProxy("/api/v1/clips", cfg.Model4)
	mountProxy("/api/v1/dashboard", cfg.Model4)

	// ── Cross-Model Orchestration ────────────────────────────────────

	v1 := router.Group("/api/v1/orchestrate")
	{
		// Full vehicle lookup: combines ANPR + VAHAN + Tracking + Registry
		v1.GET("/vehicle/:plate", vehicleLookupHandler(cfg, sugar))

		// Camera 360°: combines Registry + Stream + VMS Federation
		v1.GET("/camera/:camera_id", camera360Handler(cfg, sugar))

		// Platform-wide dashboard: aggregates all models
		v1.GET("/platform/summary", platformSummaryHandler(cfg, sugar))
	}

	// ── Start ────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		sugar.Infow("hybrid_gateway_listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalw("server_error", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	sugar.Info("hybrid_gateway_shutting_down")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	sugar.Info("hybrid_gateway_shutdown_complete")
}

// ── Reverse Proxy ────────────────────────────────────────────────────────────

func reverseProxy(target string, logger *zap.SugaredLogger) gin.HandlerFunc {
	targetURL, err := url.Parse(target)
	if err != nil {
		logger.Fatalw("invalid_proxy_target", "url", target, "error", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	proxy.ModifyResponse = func(resp *http.Response) error {
		if loc := resp.Header.Get("Location"); loc != "" {
			if parsedLoc, err := url.Parse(loc); err == nil {
				parsedLoc.Scheme = ""
				parsedLoc.Host = ""
				resp.Header.Set("Location", parsedLoc.String())
			}
		}
		return nil
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		logger.Warnw("proxy_error", "target", target, "path", r.URL.Path, "error", err)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error":"upstream service unavailable"}`))
	}

	return func(c *gin.Context) {
		c.Request.Host = targetURL.Host
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

// ── Cross-Model Orchestration Handlers ───────────────────────────────────────

func vehicleLookupHandler(cfg *GatewayConfig, logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		plate := c.Param("plate")
		client := &http.Client{Timeout: 10 * time.Second}
		result := gin.H{"plate": plate}

		// 1. ANPR detections from Model 2
		anprURL := fmt.Sprintf("%s/api/v1/anpr/search?plate_number=%s", cfg.Model2, url.QueryEscape(plate))
		if body, err := httpGet(client, anprURL); err == nil {
			result["anpr"] = body
		}

		// 2. Watchlist status from Model 2
		watchURL := fmt.Sprintf("%s/api/v1/watchlist?type=stolen_vehicle", cfg.Model2)
		if body, err := httpGet(client, watchURL); err == nil {
			result["watchlist"] = body
		}

		// 3. Trajectory from Model 4
		trackURL := fmt.Sprintf("%s/api/v1/tracking/vehicles/%s", cfg.Model4, url.PathEscape(plate))
		if body, err := httpGet(client, trackURL); err == nil {
			result["tracking"] = body
		}

		c.JSON(http.StatusOK, result)
	}
}

func camera360Handler(cfg *GatewayConfig, logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		cameraID := c.Param("camera_id")
		client := &http.Client{Timeout: 10 * time.Second}
		result := gin.H{"camera_id": cameraID}

		// 1. Registry info from Model 1
		regURL := fmt.Sprintf("%s/api/v1/cameras/%s", cfg.Model1, url.PathEscape(cameraID))
		if body, err := httpGet(client, regURL); err == nil {
			result["registry"] = body
		}

		// 2. Stream status from Model 2
		streamURL := fmt.Sprintf("%s/api/v1/streams/%s", cfg.Model2, url.PathEscape(cameraID))
		if body, err := httpGet(client, streamURL); err == nil {
			result["stream"] = body
		}

		// 3. Recent detections from Model 2
		detURL := fmt.Sprintf("%s/api/v1/anpr/detections?camera_id=%s&page_size=10", cfg.Model2, url.QueryEscape(cameraID))
		if body, err := httpGet(client, detURL); err == nil {
			result["recent_detections"] = body
		}

		c.JSON(http.StatusOK, result)
	}
}

func platformSummaryHandler(cfg *GatewayConfig, logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := &http.Client{Timeout: 5 * time.Second}
		summary := gin.H{"service": "sentinel-hybrid-gateway"}

		// Model 1 camera count
		if body, err := httpGet(client, cfg.Model1+"/api/v1/cameras?page_size=1"); err == nil {
			summary["model1_registry"] = body
		}

		// Model 2 ANPR stats
		if body, err := httpGet(client, cfg.Model2+"/api/v1/anpr/stats"); err == nil {
			summary["model2_anpr"] = body
		}

		// Model 2 stream catalogue
		if body, err := httpGet(client, cfg.Model2+"/api/v1/streams"); err == nil {
			summary["model2_streams"] = body
		}

		// Model 3 federation
		if body, err := httpGet(client, cfg.Model3+"/api/v1/federation/vms"); err == nil {
			summary["model3_federation"] = body
		}

		// Model 4 tracking summary
		if body, err := httpGet(client, cfg.Model4+"/api/v1/dashboard/summary"); err == nil {
			summary["model4_tracking"] = body
		}

		c.JSON(http.StatusOK, summary)
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func httpGet(client *http.Client, url string) (string, error) {
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return string(body), nil
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Model")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func requestLogger(logger *zap.SugaredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		logger.Debugw("request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"latency_ms", time.Since(start).Milliseconds(),
		)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	var i int
	fmt.Sscanf(v, "%d", &i)
	if i == 0 {
		return fallback
	}
	return i
}

// Unused but keeps the import used
var _ = strings.TrimSpace
