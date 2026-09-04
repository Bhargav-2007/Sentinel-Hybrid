"""Application settings and configuration management for Gujarat Sentinel Orchestrator."""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # ── Platform Identity ──
    PROJECT_NAME: str = "Gujarat Sentinel — Hybrid Surveillance Platform"
    VERSION: str = "5.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development | staging | production
    DEBUG: bool = False
    
    # ── Server & Binding ──
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # ── Security & Authentication ──
    SECRET_KEY: str = Field(
        default="sentinel-police-secret-key-2026-gujarat-state-cyber-command",
        description="HMAC secret key for JWT tokens and Section 65B hash chaining"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12-hour police shift duration
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ── RBAC & Break-Glass Protocol ──
    BREAK_GLASS_ENABLED: bool = True
    BREAK_GLASS_AUTO_EXPIRE_MINUTES: int = 60
    MANDATORY_AUDIT_LOGGING: bool = True
    
    # ── CORS Settings ──
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "https://sentinel.gujarat.gov.in",
    ]
    
    # ── Database: PostgreSQL 16 + PostGIS ──
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "sentinel"
    POSTGRES_USER: str = "sentinel"
    POSTGRES_PASSWORD: str = "sentinel_secure_pass_2026"
    DATABASE_URL: Optional[str] = None
    
    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("sqlite+aiosqlite"):
                return self.DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        
    # SQLite fallback for local testing without Docker
    SQLITE_FALLBACK_URL: str = "sqlite+aiosqlite:///./sentinel_platform.db"

    # ── Redis (Cache, Pub/Sub, Live WebSockets) ──
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = "redis_secure_pass"
    
    # ── External AI Model Backends (HTTP Endpoints) ──
    # CRITICAL: Consumed as external services only — never modified
    MODEL1_URL: str = "http://model1:8001/api/v1"  # Centralized Registry & PostGIS GIS
    MODEL2_URL: str = "http://model2:8002/api/v1"  # Unified Viewing & ANPR (YOLOv8 + PaddleOCR)
    MODEL3_URL: str = "http://model3:8003/api/v1"  # VMS Federation (Spring Boot 3.4)
    MODEL4_URL: str = "http://model4:8004/api/v1"  # Central Trajectory Tracking & S3 (Go Gin)
    
    # Local fallback endpoints for development outside docker network
    MODEL1_LOCAL_URL: str = "http://localhost:8001/api/v1"
    MODEL2_LOCAL_URL: str = "http://localhost:8002/api/v1"
    MODEL3_LOCAL_URL: str = "http://localhost:8003/api/v1"
    MODEL4_LOCAL_URL: str = "http://localhost:8004/api/v1"

    # ── Official Sentinel Sandbox Camera Integration ──
    SENTINEL_SANDBOX_HOST: str = "103.250.160.189"
    SENTINEL_RTSP_BASE: str = "rtsp://103.250.160.189:8554/stream"
    SENTINEL_WHEP_BASE: str = "http://103.250.160.189:8889/stream"
    SENTINEL_HLS_BASE: str = "https://cctv.corp8.cloud"
    SENTINEL_CATALOGUE_URL: str = "https://cctv.corp8.cloud/cameras.json"
    
    # ── Rate Limiting (Cybersecurity) ──
    RATE_LIMIT_PER_MINUTE: int = 120
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10
    
    # ── Sizing and SRE Capacity ──
    CAMERA_TARGET_SCALE: int = 50  # Current sandbox deployment
    STATEWIDE_SCALE_MAX: int = 80000  # Full Gujarat scale target

    # ── Stream Authentication (Runtime Centralized Credentials) ──
    SENTINEL_STREAM_USER: str = ""
    SENTINEL_STREAM_PASSWORD: str = ""

    def get_authenticated_rtsp_url(self, cam_tag: str) -> str:
        """
        Constructs RTSP URL for stream ingestion.
        URL-encodes '@' in username (e.g. alice%40example.com).
        """
        from urllib.parse import quote
        host = self.SENTINEL_SANDBOX_HOST
        port = 8554
        if self.SENTINEL_STREAM_USER and self.SENTINEL_STREAM_PASSWORD:
            encoded_user = quote(self.SENTINEL_STREAM_USER, safe="")
            encoded_pass = quote(self.SENTINEL_STREAM_PASSWORD, safe="")
            return f"rtsp://{encoded_user}:{encoded_pass}@{host}:{port}/stream/{cam_tag}"
        return f"rtsp://{host}:{port}/stream/{cam_tag}"

    def get_whep_endpoint(self, cam_tag: str) -> str:
        return f"{self.SENTINEL_WHEP_BASE}/{cam_tag}/whep"

    def get_hls_url(self, cam_tag: str) -> str:
        return f"{self.SENTINEL_HLS_BASE}/{cam_tag}/index.m3u8"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
