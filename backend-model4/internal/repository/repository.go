// Gujarat Sentinel — Model 4 Database Repository
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TrackedVehicle represents a vehicle being tracked across cameras.
type TrackedVehicle struct {
	ID               uuid.UUID  `json:"id"`
	PlateNumber      string     `json:"plate_number"`
	PlateNormalised  string     `json:"plate_normalised"`
	FirstSeenAt      time.Time  `json:"first_seen_at"`
	LastSeenAt       time.Time  `json:"last_seen_at"`
	TotalDetections  int        `json:"total_detections"`
	CamerasSeen      int        `json:"cameras_seen"`
	DistrictsVisited []string   `json:"districts_visited"`
	IsStolen         bool       `json:"is_stolen"`
	IsBlacklisted    bool       `json:"is_blacklisted"`
	VehicleType      string     `json:"vehicle_type,omitempty"`
	VehicleColor     string     `json:"vehicle_color,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// TrajectoryPoint is a single point on a vehicle's trajectory.
type TrajectoryPoint struct {
	DetectionID uuid.UUID `json:"detection_id"`
	CameraID    string    `json:"camera_id"`
	District    string    `json:"district,omitempty"`
	Latitude    float64   `json:"latitude,omitempty"`
	Longitude   float64   `json:"longitude,omitempty"`
	Confidence  float64   `json:"confidence"`
	Timestamp   time.Time `json:"timestamp"`
	SnapshotURL string    `json:"snapshot_url,omitempty"`
}

// Encounter represents two vehicles seen together at the same camera/time.
type Encounter struct {
	ID        uuid.UUID `json:"id"`
	Plate1    string    `json:"plate_1"`
	Plate2    string    `json:"plate_2"`
	CameraID  string    `json:"camera_id"`
	District  string    `json:"district,omitempty"`
	Timestamp time.Time `json:"timestamp"`
	DeltaSec  int       `json:"delta_seconds"`
}

// VideoClip represents an extracted video clip stored in S3.
type VideoClip struct {
	ID          uuid.UUID `json:"id"`
	CameraID    string    `json:"camera_id"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	DurationSec int       `json:"duration_sec"`
	S3Key       string    `json:"s3_key"`
	S3URL       string    `json:"s3_url"`
	SizeBytes   int64     `json:"size_bytes"`
	Codec       string    `json:"codec,omitempty"`
	RequestedBy string    `json:"requested_by,omitempty"`
	Status      string    `json:"status"` // pending, processing, ready, failed
	CreatedAt   time.Time `json:"created_at"`
}

// ── Pool ─────────────────────────────────────────────────────────────────────

func NewPostgresPool(connString string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	config.MaxConns = 20
	config.MinConns = 5
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}

	return pool, nil
}

// ── Migration ────────────────────────────────────────────────────────────────

func Migrate(pool *pgxpool.Pool) error {
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS tracked_vehicles (
			id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			plate_number      VARCHAR(20) NOT NULL,
			plate_normalised  VARCHAR(20) NOT NULL,
			first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
			last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
			total_detections  INTEGER NOT NULL DEFAULT 1,
			cameras_seen      INTEGER NOT NULL DEFAULT 1,
			districts_visited TEXT[] DEFAULT '{}',
			is_stolen         BOOLEAN NOT NULL DEFAULT false,
			is_blacklisted    BOOLEAN NOT NULL DEFAULT false,
			vehicle_type      VARCHAR(30),
			vehicle_color     VARCHAR(30),
			created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE UNIQUE INDEX IF NOT EXISTS idx_tv_plate ON tracked_vehicles(plate_normalised);
		CREATE INDEX IF NOT EXISTS idx_tv_last_seen ON tracked_vehicles(last_seen_at DESC);
		CREATE INDEX IF NOT EXISTS idx_tv_stolen ON tracked_vehicles(is_stolen) WHERE is_stolen = true;

		CREATE TABLE IF NOT EXISTS trajectory_points (
			id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			vehicle_id    UUID NOT NULL REFERENCES tracked_vehicles(id),
			detection_id  UUID NOT NULL,
			camera_id     VARCHAR(64) NOT NULL,
			district      VARCHAR(100),
			latitude      FLOAT,
			longitude     FLOAT,
			confidence    FLOAT NOT NULL,
			timestamp     TIMESTAMPTZ NOT NULL,
			snapshot_url  TEXT
		);

		CREATE INDEX IF NOT EXISTS idx_tp_vehicle ON trajectory_points(vehicle_id, timestamp);
		CREATE INDEX IF NOT EXISTS idx_tp_camera ON trajectory_points(camera_id, timestamp);

		CREATE TABLE IF NOT EXISTS encounters (
			id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			plate_1   VARCHAR(20) NOT NULL,
			plate_2   VARCHAR(20) NOT NULL,
			camera_id VARCHAR(64) NOT NULL,
			district  VARCHAR(100),
			timestamp TIMESTAMPTZ NOT NULL,
			delta_sec INTEGER NOT NULL
		);

		CREATE INDEX IF NOT EXISTS idx_enc_plates ON encounters(plate_1, plate_2);

		CREATE TABLE IF NOT EXISTS video_clips (
			id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			camera_id     VARCHAR(64) NOT NULL,
			start_time    TIMESTAMPTZ NOT NULL,
			end_time      TIMESTAMPTZ NOT NULL,
			duration_sec  INTEGER NOT NULL,
			s3_key        TEXT NOT NULL,
			s3_url        TEXT NOT NULL,
			size_bytes    BIGINT DEFAULT 0,
			codec         VARCHAR(20),
			requested_by  VARCHAR(100),
			status        VARCHAR(20) NOT NULL DEFAULT 'pending',
			created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE INDEX IF NOT EXISTS idx_clips_camera ON video_clips(camera_id, start_time);
	`)
	return err
}

// ── Tracking Repository ──────────────────────────────────────────────────────

type TrackingRepository struct {
	pool *pgxpool.Pool
}

func NewTrackingRepository(pool *pgxpool.Pool) *TrackingRepository {
	return &TrackingRepository{pool: pool}
}

func (r *TrackingRepository) UpsertVehicle(ctx context.Context, v *TrackedVehicle) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO tracked_vehicles (plate_number, plate_normalised, first_seen_at, last_seen_at,
			total_detections, cameras_seen, districts_visited, is_stolen, is_blacklisted,
			vehicle_type, vehicle_color)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (plate_normalised) DO UPDATE SET
			last_seen_at = EXCLUDED.last_seen_at,
			total_detections = tracked_vehicles.total_detections + 1,
			cameras_seen = EXCLUDED.cameras_seen,
			districts_visited = EXCLUDED.districts_visited,
			is_stolen = EXCLUDED.is_stolen,
			is_blacklisted = EXCLUDED.is_blacklisted,
			updated_at = now()
	`, v.PlateNumber, v.PlateNormalised, v.FirstSeenAt, v.LastSeenAt,
		v.TotalDetections, v.CamerasSeen, v.DistrictsVisited,
		v.IsStolen, v.IsBlacklisted, v.VehicleType, v.VehicleColor)
	return err
}

func (r *TrackingRepository) AddTrajectoryPoint(ctx context.Context, vehicleID uuid.UUID, pt *TrajectoryPoint) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO trajectory_points (vehicle_id, detection_id, camera_id, district,
			latitude, longitude, confidence, timestamp, snapshot_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, vehicleID, pt.DetectionID, pt.CameraID, pt.District,
		pt.Latitude, pt.Longitude, pt.Confidence, pt.Timestamp, pt.SnapshotURL)
	return err
}

func (r *TrackingRepository) GetVehicleByPlate(ctx context.Context, plateNorm string) (*TrackedVehicle, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, plate_number, plate_normalised, first_seen_at, last_seen_at,
			total_detections, cameras_seen, districts_visited, is_stolen, is_blacklisted,
			vehicle_type, vehicle_color
		FROM tracked_vehicles WHERE plate_normalised = $1
	`, plateNorm)

	var v TrackedVehicle
	err := row.Scan(&v.ID, &v.PlateNumber, &v.PlateNormalised, &v.FirstSeenAt, &v.LastSeenAt,
		&v.TotalDetections, &v.CamerasSeen, &v.DistrictsVisited, &v.IsStolen, &v.IsBlacklisted,
		&v.VehicleType, &v.VehicleColor)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *TrackingRepository) GetTrajectory(ctx context.Context, vehicleID uuid.UUID) ([]TrajectoryPoint, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT detection_id, camera_id, district, latitude, longitude, confidence, timestamp, snapshot_url
		FROM trajectory_points WHERE vehicle_id = $1 ORDER BY timestamp ASC
	`, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []TrajectoryPoint
	for rows.Next() {
		var pt TrajectoryPoint
		if err := rows.Scan(&pt.DetectionID, &pt.CameraID, &pt.District,
			&pt.Latitude, &pt.Longitude, &pt.Confidence, &pt.Timestamp, &pt.SnapshotURL); err != nil {
			return nil, err
		}
		points = append(points, pt)
	}
	return points, nil
}

func (r *TrackingRepository) ListRecentVehicles(ctx context.Context, limit int) ([]TrackedVehicle, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, plate_number, plate_normalised, first_seen_at, last_seen_at,
			total_detections, cameras_seen, districts_visited, is_stolen, is_blacklisted,
			vehicle_type, vehicle_color
		FROM tracked_vehicles ORDER BY last_seen_at DESC LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []TrackedVehicle
	for rows.Next() {
		var v TrackedVehicle
		if err := rows.Scan(&v.ID, &v.PlateNumber, &v.PlateNormalised, &v.FirstSeenAt, &v.LastSeenAt,
			&v.TotalDetections, &v.CamerasSeen, &v.DistrictsVisited, &v.IsStolen, &v.IsBlacklisted,
			&v.VehicleType, &v.VehicleColor); err != nil {
			return nil, err
		}
		vehicles = append(vehicles, v)
	}
	return vehicles, nil
}

func (r *TrackingRepository) CountVehicles(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM tracked_vehicles`).Scan(&count)
	return count, err
}

// ── Clip Repository ──────────────────────────────────────────────────────────

type ClipRepository struct {
	pool *pgxpool.Pool
}

func NewClipRepository(pool *pgxpool.Pool) *ClipRepository {
	return &ClipRepository{pool: pool}
}

func (r *ClipRepository) CreateClip(ctx context.Context, c *VideoClip) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO video_clips (id, camera_id, start_time, end_time, duration_sec,
			s3_key, s3_url, size_bytes, codec, requested_by, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, c.ID, c.CameraID, c.StartTime, c.EndTime, c.DurationSec,
		c.S3Key, c.S3URL, c.SizeBytes, c.Codec, c.RequestedBy, c.Status)
	return err
}

func (r *ClipRepository) GetClip(ctx context.Context, id uuid.UUID) (*VideoClip, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, camera_id, start_time, end_time, duration_sec,
			s3_key, s3_url, size_bytes, codec, requested_by, status, created_at
		FROM video_clips WHERE id = $1
	`, id)

	var c VideoClip
	err := row.Scan(&c.ID, &c.CameraID, &c.StartTime, &c.EndTime, &c.DurationSec,
		&c.S3Key, &c.S3URL, &c.SizeBytes, &c.Codec, &c.RequestedBy, &c.Status, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ClipRepository) ListClips(ctx context.Context, limit int) ([]VideoClip, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, camera_id, start_time, end_time, duration_sec,
			s3_key, s3_url, size_bytes, codec, requested_by, status, created_at
		FROM video_clips ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clips []VideoClip
	for rows.Next() {
		var c VideoClip
		if err := rows.Scan(&c.ID, &c.CameraID, &c.StartTime, &c.EndTime, &c.DurationSec,
			&c.S3Key, &c.S3URL, &c.SizeBytes, &c.Codec, &c.RequestedBy, &c.Status, &c.CreatedAt); err != nil {
			return nil, err
		}
		clips = append(clips, c)
	}
	return clips, nil
}

func (r *ClipRepository) DeleteClip(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM video_clips WHERE id = $1`, id)
	return err
}
