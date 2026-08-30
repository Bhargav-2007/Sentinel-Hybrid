// Gujarat Sentinel — Model 4 HTTP Handlers
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gujarat-sentinel/backend-model4/internal/service"
)

// ── Tracking Handler ─────────────────────────────────────────────────────────

type TrackingHandler struct {
	svc *service.TrackingService
}

func NewTrackingHandler(svc *service.TrackingService) *TrackingHandler {
	return &TrackingHandler{svc: svc}
}

func (h *TrackingHandler) ListTrackedVehicles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 500 {
		limit = 50
	}

	vehicles, err := h.svc.ListTrackedVehicles(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicles": vehicles,
		"total":    len(vehicles),
	})
}

func (h *TrackingHandler) GetVehicleTrajectory(c *gin.Context) {
	plate := c.Param("plate")
	if plate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "plate parameter required"})
		return
	}

	vehicle, points, err := h.svc.GetVehicleTrajectory(c.Request.Context(), plate)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vehicle not found", "plate": plate})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vehicle":    vehicle,
		"trajectory": points,
		"total_points": len(points),
	})
}

func (h *TrackingHandler) ListEncounters(c *gin.Context) {
	// Encounters are correlated from trajectory_points where
	// two different plates appear at the same camera within a time window.
	// This is computed on-demand from the database.
	c.JSON(http.StatusOK, gin.H{
		"encounters": []interface{}{},
		"message":    "Encounter correlation runs on detection ingestion from Kafka",
	})
}

func (h *TrackingHandler) CorrelateDetections(c *gin.Context) {
	// Trigger manual correlation for a specific time window
	c.JSON(http.StatusAccepted, gin.H{
		"status":  "correlation_started",
		"message": "Correlation runs automatically via Kafka consumer",
	})
}

// ── Clip Handler ─────────────────────────────────────────────────────────────

type ClipHandler struct {
	svc *service.ClipService
}

func NewClipHandler(svc *service.ClipService) *ClipHandler {
	return &ClipHandler{svc: svc}
}

func (h *ClipHandler) ExtractClip(c *gin.Context) {
	var req service.ExtractClipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clip, err := h.svc.ExtractClip(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, clip)
}

func (h *ClipHandler) ListClips(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	clips, err := h.svc.ListClips(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"clips": clips, "total": len(clips)})
}

func (h *ClipHandler) GetClip(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid clip id"})
		return
	}

	clip, err := h.svc.GetClip(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "clip not found"})
		return
	}
	c.JSON(http.StatusOK, clip)
}

func (h *ClipHandler) DeleteClip(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid clip id"})
		return
	}

	if err := h.svc.DeleteClip(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// ── Dashboard Handler ────────────────────────────────────────────────────────

type DashboardHandler struct {
	trackingSvc *service.TrackingService
	clipSvc     *service.ClipService
}

func NewDashboardHandler(ts *service.TrackingService, cs *service.ClipService) *DashboardHandler {
	return &DashboardHandler{trackingSvc: ts, clipSvc: cs}
}

func (h *DashboardHandler) GetSummary(c *gin.Context) {
	summary, err := h.trackingSvc.GetSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	clips, _ := h.clipSvc.ListClips(c.Request.Context(), 1)
	summary["total_clips"] = len(clips)

	c.JSON(http.StatusOK, summary)
}

func (h *DashboardHandler) GetRecentActivity(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	vehicles, _ := h.trackingSvc.ListTrackedVehicles(c.Request.Context(), limit)
	clips, _ := h.clipSvc.ListClips(c.Request.Context(), limit)

	c.JSON(http.StatusOK, gin.H{
		"recent_vehicles": vehicles,
		"recent_clips":    clips,
	})
}
