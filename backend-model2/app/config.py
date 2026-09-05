"""
Gujarat Sentinel — Model 2: Unified Viewing & ANPR Analytics
Application Configuration
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8",
        case_sensitive=False, extra="ignore",
    )

    # ── Service ───────────────────────────────────────────────────────────
    model2_service_name: str = "sentinel-model2"
    service_version: str = "1.0.0"
    environment: str = "development"
    data_mode: str = "real"                # real | simulation | benchmark
    enable_dev_seed: bool = False          # False by default (No fake data generation)
    model2_host: str = "0.0.0.0"
    model2_port: int = 8002
    api_v1_prefix: str = "/api/v1"

    # ── Database ──────────────────────────────────────────────────────────
    model2_database_url: str = "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinel_model2"

    # ── Redis ─────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/1"

    # ── Kafka ─────────────────────────────────────────────────────────────
    kafka_bootstrap_servers: str = "localhost:29092"
    kafka_group_id: str = "sentinel-model2-consumer"
    topic_detection_events: str = "sentinel.detection.events"
    topic_alert_events: str = "sentinel.alert.events"
    topic_camera_events: str = "sentinel.camera.events"

    # ── OpenSearch ────────────────────────────────────────────────────────
    opensearch_url: str = "http://localhost:9200"
    opensearch_index_detections: str = "sentinel-anpr-detections"
    opensearch_index_events: str = "sentinel-events"

    # ── RTSP Live Ingest & Authoritative Gateway ──────────────────────────
    sentinel_ingest_api: str = "http://localhost:8888/api/ingest"
    sentinel_rtsp_host: str = "103.250.160.189"
    sentinel_rtsp_port: int = 8554
    sentinel_stream_user: str = "bhargav.umetiya@gmail.com"
    sentinel_stream_password: str = "PJMN-KC93-T648"
    ai_service_url: str = "http://localhost:8006"
    orchestrator_url: str = "http://localhost:8005"  # For HTTP fallback when Kafka unavailable


    # ── External APIs ────────────────────────────────────────────────────
    vahan_api_url: str = "http://mock-external-apis:8090/vahan"
    sarthi_api_url: str = "http://mock-external-apis:8090/sarthi"
    egujcop_api_url: str = "http://mock-external-apis:8090/egujcop"

    # ── AI/ML ─────────────────────────────────────────────────────────────
    yolo_model_name: str = "yolov8n.pt"
    yolo_confidence_threshold: float = 0.5
    yolo_vehicle_classes: list[int] = [2, 3, 5, 7]  # car, motorcycle, bus, truck
    anpr_confidence_threshold: float = 0.6
    anpr_use_gpu: bool = False
    detection_batch_size: int = 4
    max_concurrent_streams: int = 10

    # ── S3 (MinIO) ────────────────────────────────────────────────────────
    s3_endpoint: str = "http://minio:9000"
    s3_access_key: str = "minio_access_key"
    s3_secret_key: str = "minio_secret_key"
    s3_bucket_snapshots: str = "sentinel-snapshots"
    s3_bucket_clips: str = "sentinel-clips"

    # ── Stream Processing ─────────────────────────────────────────────────
    rtsp_reconnect_delay_sec: int = 2
    rtsp_max_reconnect_attempts: int = 10
    rtsp_frame_skip: int = 5             # Process every Nth frame for ANPR
    rtsp_transport: str = "tcp"          # MUST be TCP per Sentinel requirements
    anpr_min_plate_width_px: int = 60    # Minimum plate width for OCR attempt

    # ── Security ──────────────────────────────────────────────────────────
    auth_disabled: bool = True
    oidc_issuer: str = "http://keycloak:8080/realms/sentinel"
    oidc_audience: str = "sentinel-api"
    oidc_jwks_url: str = "http://keycloak:8080/realms/sentinel/protocol/openid-connect/certs"

    # ── OTel ──────────────────────────────────────────────────────────────
    otel_exporter_otlp_endpoint: str = "http://otel-collector:4317"
    otel_service_namespace: str = "sentinel"

    @property
    def is_dev(self) -> bool:
        return self.environment.lower() in ("development", "dev", "local")

    @field_validator("model2_database_url", mode="before")
    @classmethod
    def fix_db_url(cls, v: str) -> str:
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
