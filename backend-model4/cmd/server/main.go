// Gujarat Sentinel — Model 4: Central VMS & Vehicle Tracking
//
// Architecture:
//   Gin HTTP → Handler → Service → Repository (pgx) + Kafka + S3
//
// Key Features:
//   - Multi-camera vehicle trajectory tracking
//   - Cross-camera route reconstruction (consumes from Model 2 Kafka topic)
//   - Video clip extraction and S3 storage
//   - Vehicle encounter correlation engine
//   - Configurable retention and archival policies
//
// This service consumes detection events from Model 2 (Kafka) and
// correlates them into vehicle trajectories across cameras.

package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gujarat-sentinel/backend-model4/internal/config"
	"github.com/gujarat-sentinel/backend-model4/internal/handler"
	"github.com/gujarat-sentinel/backend-model4/internal/repository"
	"github.com/gujarat-sentinel/backend-model4/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func main() {
	// ── Logger ────────────────────────────────────────────────────────
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	sugar := logger.Sugar()

	// ── Config ────────────────────────────────────────────────────────
	cfg := config.Load()
	sugar.Infow("model4_starting",
		"port", cfg.Port,
		"env", cfg.Environment,
	)

	// ── Database ──────────────────────────────────────────────────────
	db, err := repository.NewPostgresPool(cfg.DatabaseURL)
	if err != nil {
		sugar.Fatalw("database_connection_failed", "error", err)
	}
	defer db.Close()

	// Create tables
	if err := repository.Migrate(db); err != nil {
		sugar.Fatalw("migration_failed", "error", err)
	}
	sugar.Info("database_ready")

	// ── Repositories ──────────────────────────────────────────────────
	trackingRepo := repository.NewTrackingRepository(db)
	clipRepo := repository.NewClipRepository(db)

	// ── Services ──────────────────────────────────────────────────────
	trackingSvc := service.NewTrackingService(trackingRepo, cfg, sugar)
	clipSvc := service.NewClipService(clipRepo, cfg, sugar)

	// ── Kafka Consumer (detection events from Model 2) ────────────────
	go func() {
		if err := trackingSvc.StartKafkaConsumer(context.Background()); err != nil {
			sugar.Errorw("kafka_consumer_failed", "error", err)
		}
	}()

	// ── HTTP Server ───────────────────────────────────────────────────
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())

	// Health endpoints
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "sentinel-model4",
			"version": cfg.Version,
		})
	})

	router.GET("/ready", func(c *gin.Context) {
		if err := db.Ping(context.Background()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"ready": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ready": true})
	})

	// Prometheus metrics
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1
	v1 := router.Group("/api/v1")
	{
		trackingHandler := handler.NewTrackingHandler(trackingSvc)
		v1.GET("/tracking/vehicles", trackingHandler.ListTrackedVehicles)
		v1.GET("/tracking/vehicles/:plate", trackingHandler.GetVehicleTrajectory)
		v1.GET("/tracking/encounters", trackingHandler.ListEncounters)
		v1.POST("/tracking/correlate", trackingHandler.CorrelateDetections)

		clipHandler := handler.NewClipHandler(clipSvc)
		v1.POST("/clips/extract", clipHandler.ExtractClip)
		v1.GET("/clips", clipHandler.ListClips)
		v1.GET("/clips/:id", clipHandler.GetClip)
		v1.DELETE("/clips/:id", clipHandler.DeleteClip)

		dashboardHandler := handler.NewDashboardHandler(trackingSvc, clipSvc)
		v1.GET("/dashboard/summary", dashboardHandler.GetSummary)
		v1.GET("/dashboard/activity", dashboardHandler.GetRecentActivity)
	}

	// ── Start server ──────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		sugar.Infow("model4_listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalw("server_error", "error", err)
		}
	}()

	// ── Graceful shutdown ─────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	sugar.Info("model4_shutting_down")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		sugar.Fatalw("server_shutdown_error", "error", err)
	}
	sugar.Info("model4_shutdown_complete")
}
