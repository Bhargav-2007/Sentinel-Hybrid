// Gujarat Sentinel — Model 4 Configuration
package config

import (
	"fmt"
	"os"
)


type Config struct {
	Port        int
	Environment string
	Version     string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// Kafka
	KafkaBrokers         string
	KafkaGroupID         string
	TopicDetectionEvents string
	TopicTrackingEvents  string

	// S3 (MinIO)
	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string
	S3Bucket    string

	// Model 2 API
	Model2URL string

	// OTel
	OTelEndpoint string

	// Tracking
	TrajectoryWindowMinutes int
	EncounterRadiusMeters   float64
}

func Load() *Config {
	return &Config{
		Port:        getEnvInt("MODEL4_PORT", 8004),
		Environment: getEnv("ENVIRONMENT", "development"),
		Version:     "1.0.0",

		DatabaseURL: getEnv("MODEL4_DATABASE_URL",
			"postgres://sentinel:sentinel_secure_pass_2026@localhost:5432/sentinel_model4?sslmode=disable"),

		RedisURL: getEnv("REDIS_URL", "redis://localhost:6379/2"),

		KafkaBrokers:         getEnv("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092"),
		KafkaGroupID:         "sentinel-model4-consumer",
		TopicDetectionEvents: getEnv("TOPIC_DETECTION_EVENTS", "sentinel.detection.events"),
		TopicTrackingEvents:  getEnv("TOPIC_TRACKING_EVENTS", "sentinel.tracking.events"),

		S3Endpoint:  getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKey: getEnv("S3_ACCESS_KEY", "minio_access_key"),
		S3SecretKey: getEnv("S3_SECRET_KEY", "minio_secret_key"),
		S3Bucket:    getEnv("S3_BUCKET", "sentinel-clips"),

		Model2URL: getEnv("MODEL2_URL", "http://localhost:8002"),

		OTelEndpoint: getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317"),

		TrajectoryWindowMinutes: getEnvInt("TRAJECTORY_WINDOW_MINUTES", 120),
		EncounterRadiusMeters:   500.0,
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
	_, _ = fmt.Sscanf(v, "%d", &i)
	if i == 0 {
		return fallback
	}
	return i
}
