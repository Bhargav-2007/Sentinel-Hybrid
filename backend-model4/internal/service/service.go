// Gujarat Sentinel — Model 4 Services
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gujarat-sentinel/backend-model4/internal/config"
	"github.com/gujarat-sentinel/backend-model4/internal/repository"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// ── Tracking Service ─────────────────────────────────────────────────────────

// TrackingService correlates ANPR detection events from Model 2
// into multi-camera vehicle trajectories.
type TrackingService struct {
	repo   *repository.TrackingRepository
	cfg    *config.Config
	logger *zap.SugaredLogger
}

func NewTrackingService(repo *repository.TrackingRepository, cfg *config.Config, logger *zap.SugaredLogger) *TrackingService {
	return &TrackingService{repo: repo, cfg: cfg, logger: logger}
}

// DetectionEvent is a Kafka message from Model 2's detection pipeline.
type DetectionEvent struct {
	DetectionID  string  `json:"detection_id"`
	PlateNumber  string  `json:"plate_number"`
	PlateNorm    string  `json:"plate_number_normalised"`
	CameraID     string  `json:"camera_id"`
	District     string  `json:"district"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Confidence   float64 `json:"confidence"`
	Timestamp    string  `json:"timestamp"`
	VehicleType  string  `json:"vehicle_type"`
	VehicleColor string  `json:"vehicle_color"`
	IsStolen     bool    `json:"is_stolen"`
	IsBlacklisted bool   `json:"is_blacklisted"`
	SnapshotURL  string  `json:"snapshot_url"`
}

// StartKafkaConsumer listens for detection events from Model 2
// and correlates them into vehicle trajectories.
func (s *TrackingService) StartKafkaConsumer(ctx context.Context) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     strings.Split(s.cfg.KafkaBrokers, ","),
		Topic:       s.cfg.TopicDetectionEvents,
		GroupID:     s.cfg.KafkaGroupID,
		MinBytes:    1e3,
		MaxBytes:    10e6,
		StartOffset: kafka.LastOffset,
	})
	defer reader.Close()

	s.logger.Infow("kafka_consumer_started",
		"topic", s.cfg.TopicDetectionEvents,
		"group", s.cfg.KafkaGroupID,
	)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			s.logger.Errorw("kafka_read_error", "error", err)
			time.Sleep(time.Second)
			continue
		}

		var event DetectionEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			s.logger.Warnw("kafka_parse_error", "error", err)
			continue
		}

		if err := s.processDetection(ctx, &event); err != nil {
			s.logger.Errorw("detection_processing_error",
				"plate", event.PlateNumber,
				"error", err,
			)
		}
	}
}

func (s *TrackingService) processDetection(ctx context.Context, event *DetectionEvent) error {
	plateNorm := normalisePlate(event.PlateNorm)
	if plateNorm == "" {
		plateNorm = normalisePlate(event.PlateNumber)
	}

	ts, _ := time.Parse(time.RFC3339, event.Timestamp)
	if ts.IsZero() {
		ts = time.Now().UTC()
	}

	detectionID, _ := uuid.Parse(event.DetectionID)
	if detectionID == uuid.Nil {
		detectionID = uuid.New()
	}

	// Upsert vehicle
	vehicle := &repository.TrackedVehicle{
		PlateNumber:     event.PlateNumber,
		PlateNormalised: plateNorm,
		FirstSeenAt:     ts,
		LastSeenAt:      ts,
		TotalDetections: 1,
		CamerasSeen:     1,
		DistrictsVisited: []string{event.District},
		IsStolen:        event.IsStolen,
		IsBlacklisted:   event.IsBlacklisted,
		VehicleType:     event.VehicleType,
		VehicleColor:    event.VehicleColor,
	}

	if err := s.repo.UpsertVehicle(ctx, vehicle); err != nil {
		return fmt.Errorf("upsert vehicle: %w", err)
	}

	// Get the vehicle ID for trajectory point
	existing, err := s.repo.GetVehicleByPlate(ctx, plateNorm)
	if err != nil {
		return fmt.Errorf("get vehicle: %w", err)
	}

	// Add trajectory point
	point := &repository.TrajectoryPoint{
		DetectionID: detectionID,
		CameraID:    event.CameraID,
		District:    event.District,
		Latitude:    event.Latitude,
		Longitude:   event.Longitude,
		Confidence:  event.Confidence,
		Timestamp:   ts,
		SnapshotURL: event.SnapshotURL,
	}

	if err := s.repo.AddTrajectoryPoint(ctx, existing.ID, point); err != nil {
		return fmt.Errorf("add trajectory: %w", err)
	}

	s.logger.Debugw("detection_processed",
		"plate", event.PlateNumber,
		"camera", event.CameraID,
		"stolen", event.IsStolen,
	)

	return nil
}

// ListTrackedVehicles returns recently tracked vehicles.
func (s *TrackingService) ListTrackedVehicles(ctx context.Context, limit int) ([]repository.TrackedVehicle, error) {
	return s.repo.ListRecentVehicles(ctx, limit)
}

// GetVehicleTrajectory returns the full trajectory for a plate.
func (s *TrackingService) GetVehicleTrajectory(ctx context.Context, plate string) (*repository.TrackedVehicle, []repository.TrajectoryPoint, error) {
	norm := normalisePlate(plate)
	vehicle, err := s.repo.GetVehicleByPlate(ctx, norm)
	if err != nil {
		return nil, nil, err
	}

	points, err := s.repo.GetTrajectory(ctx, vehicle.ID)
	if err != nil {
		return vehicle, nil, err
	}

	return vehicle, points, nil
}

// GetSummary returns dashboard statistics.
func (s *TrackingService) GetSummary(ctx context.Context) (map[string]interface{}, error) {
	count, err := s.repo.CountVehicles(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_tracked_vehicles": count,
		"service":                "sentinel-model4",
	}, nil
}

var plateRegex = regexp.MustCompile(`[^A-Z0-9]`)

func normalisePlate(plate string) string {
	return plateRegex.ReplaceAllString(strings.ToUpper(strings.TrimSpace(plate)), "")
}

// ── Clip Service ─────────────────────────────────────────────────────────────

// ClipService manages video clip extraction and S3 storage.
type ClipService struct {
	repo   *repository.ClipRepository
	cfg    *config.Config
	logger *zap.SugaredLogger
}

func NewClipService(repo *repository.ClipRepository, cfg *config.Config, logger *zap.SugaredLogger) *ClipService {
	return &ClipService{repo: repo, cfg: cfg, logger: logger}
}

// ExtractClipRequest is the input for clip extraction.
type ExtractClipRequest struct {
	CameraID    string `json:"camera_id" binding:"required"`
	StartTime   string `json:"start_time" binding:"required"`
	EndTime     string `json:"end_time" binding:"required"`
	RequestedBy string `json:"requested_by"`
}

// ExtractClip creates a clip extraction job.
func (s *ClipService) ExtractClip(ctx context.Context, req *ExtractClipRequest) (*repository.VideoClip, error) {
	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		return nil, fmt.Errorf("invalid start_time: %w", err)
	}
	endTime, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		return nil, fmt.Errorf("invalid end_time: %w", err)
	}

	duration := int(endTime.Sub(startTime).Seconds())
	clipID := uuid.New()
	s3Key := fmt.Sprintf("clips/%s/%s/%s.mp4",
		startTime.Format("2006/01/02"),
		req.CameraID,
		clipID.String(),
	)

	clip := &repository.VideoClip{
		ID:          clipID,
		CameraID:    req.CameraID,
		StartTime:   startTime,
		EndTime:     endTime,
		DurationSec: duration,
		S3Key:       s3Key,
		S3URL:       fmt.Sprintf("%s/%s/%s", s.cfg.S3Endpoint, s.cfg.S3Bucket, s3Key),
		Codec:       "h264",
		RequestedBy: req.RequestedBy,
		Status:      "pending",
	}

	if err := s.repo.CreateClip(ctx, clip); err != nil {
		return nil, fmt.Errorf("create clip: %w", err)
	}

	s.logger.Infow("clip_extraction_requested",
		"clip_id", clipID.String(),
		"camera", req.CameraID,
		"duration_sec", duration,
	)

	return clip, nil
}

func (s *ClipService) GetClip(ctx context.Context, id uuid.UUID) (*repository.VideoClip, error) {
	return s.repo.GetClip(ctx, id)
}

func (s *ClipService) ListClips(ctx context.Context, limit int) ([]repository.VideoClip, error) {
	return s.repo.ListClips(ctx, limit)
}

func (s *ClipService) DeleteClip(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteClip(ctx, id)
}
