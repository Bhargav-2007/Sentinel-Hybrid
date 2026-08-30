"""
Gujarat Sentinel — Model 1
Application Configuration

Uses Pydantic Settings v2 for environment variable loading
with strong typing and validation.

All settings have sensible defaults for development.
Production values are loaded from .env file or container secrets.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import AnyUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for Model 1 service.
    All values can be overridden via environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Service identity ──────────────────────────────────────────────────
    model1_service_name: str = "sentinel-model1"
    service_version: str = "1.0.0"
    environment: str = Field(default="development")

    # ── HTTP server ───────────────────────────────────────────────────────
    model1_host: str = "0.0.0.0"
    model1_port: int = 8001
    api_v1_prefix: str = "/api/v1"
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    openapi_url: str = "/openapi.json"
    allowed_origins: list[str] = ["*"]

    # ── Database ──────────────────────────────────────────────────────────
    model1_database_url: str = (
        "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinel_model1"
    )
    model1_gis_srid: int = 4326

    # ── Redis ─────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    camera_status_cache_ttl: int = 30   # seconds
    jwks_cache_ttl: int = 3600          # seconds

    # ── Kafka ─────────────────────────────────────────────────────────────
    kafka_bootstrap_servers: str = "localhost:29092"
    kafka_group_id: str = "sentinel-model1-consumer"
    topic_camera_events: str = "sentinel.camera.events"
    topic_audit_events: str = "sentinel.audit.events"
    topic_health_events: str = "sentinel.health.events"

    # ── OIDC / Keycloak ───────────────────────────────────────────────────
    auth_disabled: bool = True   # Disabled for hackathon demo
    oidc_issuer: str = "http://keycloak:8080/realms/sentinel"
    oidc_audience: str = "sentinel-api"
    oidc_jwks_url: str = "http://keycloak:8080/realms/sentinel/protocol/openid-connect/certs"

    # ── OPA ───────────────────────────────────────────────────────────────
    opa_disabled: bool = True   # Disabled for hackathon demo
    opa_url: str = "http://opa:8181"
    opa_policy_path: str = "sentinel/model1"

    # ── OpenTelemetry ─────────────────────────────────────────────────────
    otel_exporter_otlp_endpoint: str = "http://otel-collector:4317"
    otel_service_namespace: str = "sentinel"
    otel_traces_sampler_arg: float = 1.0   # 100% sampling in dev

    # ── Health polling ────────────────────────────────────────────────────
    health_poll_interval_sec: int = 30
    rtsp_probe_timeout_sec: int = 5
    max_concurrent_health_probes: int = 50
    health_check_retention: int = 30    # Keep last N records per camera

    # ── Business rules ────────────────────────────────────────────────────
    model1_max_bulk_cameras: int = 10000
    model1_max_page_size: int = 1000
    audit_retention_days: int = 365

    @property
    def is_dev(self) -> bool:
        return self.environment.lower() in ("development", "dev", "local")

    @property
    def is_prod(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @field_validator("model1_database_url", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v:
            raise ValueError("MODEL1_DATABASE_URL must be set")
        # Ensure asyncpg driver
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("kafka_bootstrap_servers", mode="before")
    @classmethod
    def validate_kafka_servers(cls, v: str) -> str:
        if not v:
            raise ValueError("KAFKA_BOOTSTRAP_SERVERS must be set")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings (singleton)."""
    return Settings()
