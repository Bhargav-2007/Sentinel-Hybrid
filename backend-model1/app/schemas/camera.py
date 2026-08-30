"""
Gujarat Sentinel — Model 1
Pydantic v2 schemas for request/response serialisation

Follows OpenAPI contract defined in contracts/openapi/model1.yaml
All schemas use strict typing and custom validators for Indian-specific formats.
"""

from __future__ import annotations

import re
import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.db.models import (
    CameraStatusEnum,
    CameraTypeEnum,
    CodecEnum,
    ProtocolEnum,
    StorageTypeEnum,
)

# ── Shared config ─────────────────────────────────────────────────────────────

class SentinelBaseModel(BaseModel):
    """Base model with common configuration for all Sentinel schemas."""

    model_config = ConfigDict(
        from_attributes=True,       # Enable ORM mode (from_orm)
        use_enum_values=True,       # Serialize enums as values
        str_strip_whitespace=True,  # Strip whitespace from strings
        populate_by_name=True,      # Allow both alias and field name
        protected_namespaces=(),   # Allow fields like model_number
    )


# ── Location ──────────────────────────────────────────────────────────────────

class LocationSchema(SentinelBaseModel):
    """Geographic location schema with Gujarat boundary validation."""

    latitude: float = Field(
        ...,
        ge=20.0,
        le=25.0,
        description="WGS84 latitude (Gujarat range: 20.1°N to 24.7°N)",
    )
    longitude: float = Field(
        ...,
        ge=68.0,
        le=75.0,
        description="WGS84 longitude (Gujarat range: 68.2°E to 74.5°E)",
    )
    altitude_meters: float | None = Field(None, ge=-100.0, le=9000.0)
    address: str | None = Field(None, max_length=500)
    district: str | None = Field(None, max_length=100)
    taluka: str | None = Field(None, max_length=100)
    pincode: str | None = Field(None, pattern=r"^[0-9]{6}$")


# ── Camera Create/Update ──────────────────────────────────────────────────────

class CameraCreateSchema(SentinelBaseModel):
    """Schema for registering a new camera."""

    camera_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Department-assigned ID (e.g., HP-AHM-001)",
    )
    name: str = Field(..., min_length=1, max_length=200)
    department_id: uuid.UUID
    location: LocationSchema
    camera_type: CameraTypeEnum
    protocol: ProtocolEnum | None = None
    codec: CodecEnum | None = None
    resolution: str | None = Field(None, pattern=r"^\d+x\d+$")
    frame_rate: int | None = Field(None, ge=1, le=120)
    rtsp_url: str | None = Field(None, max_length=2048)
    onvif_url: str | None = Field(None, max_length=2048)
    vendor: str | None = Field(None, max_length=100)
    model_number: str | None = Field(None, max_length=100)
    install_date: date | None = None
    amc_expiry_date: date | None = None
    storage_type: StorageTypeEnum | None = None
    retention_days: int | None = Field(None, ge=1, le=365)
    is_public_domain: bool = True
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("camera_id")
    @classmethod
    def validate_camera_id(cls, v: str) -> str:
        """Normalise and validate camera ID format."""
        v = v.strip().upper()
        # Allow alphanumeric, hyphens, underscores
        if not re.match(r"^[A-Z0-9][A-Z0-9\-_]{0,63}$", v):
            raise ValueError(
                "camera_id must be alphanumeric with optional hyphens/underscores"
            )
        return v

    @field_validator("rtsp_url", "onvif_url", mode="before")
    @classmethod
    def validate_url_scheme(cls, v: str | None) -> str | None:
        """Validate URL schemes for stream endpoints."""
        if v is None:
            return None
        v = v.strip()
        if v.startswith("rtsp://") or v.startswith("rtsps://"):
            return v
        if v.startswith("http://") or v.startswith("https://"):
            return v
        # Allow simulator placeholder format
        if v.startswith("rtsp-sim://"):
            return v
        raise ValueError(f"Invalid URL scheme for stream URL: {v[:30]}")


class CameraUpdateSchema(SentinelBaseModel):
    """Schema for partial camera metadata update."""

    name: str | None = Field(None, min_length=1, max_length=200)
    location: LocationSchema | None = None
    camera_type: CameraTypeEnum | None = None
    protocol: ProtocolEnum | None = None
    codec: CodecEnum | None = None
    resolution: str | None = Field(None, pattern=r"^\d+x\d+$")
    frame_rate: int | None = Field(None, ge=1, le=120)
    rtsp_url: str | None = Field(None, max_length=2048)
    status: CameraStatusEnum | None = None
    amc_expiry_date: date | None = None
    storage_type: StorageTypeEnum | None = None
    retention_days: int | None = Field(None, ge=1, le=365)
    tags: list[str] | None = None
    metadata: dict[str, Any] | None = None


# ── Camera Responses ──────────────────────────────────────────────────────────

class CameraHealthStatusSchema(SentinelBaseModel):
    """Health check result for a camera."""

    camera_id: uuid.UUID
    is_reachable: bool
    latency_ms: int | None = None
    stream_active: bool = False
    last_checked_at: datetime | None = None
    check_method: Literal["rtsp_probe", "onvif_probe", "ping", "api"] = "ping"
    error_message: str | None = None


class CameraResponseSchema(SentinelBaseModel):
    """Full camera metadata response (includes computed fields)."""

    id: uuid.UUID
    camera_id: str
    name: str
    department_id: uuid.UUID
    # Location is flattened from PostGIS in the service layer
    location: LocationSchema
    camera_type: CameraTypeEnum
    protocol: ProtocolEnum | None = None
    codec: CodecEnum | None = None
    resolution: str | None = None
    frame_rate: int | None = None
    vendor: str | None = None
    model_number: str | None = None
    install_date: date | None = None
    amc_expiry_date: date | None = None
    storage_type: StorageTypeEnum | None = None
    retention_days: int | None = None
    is_public_domain: bool
    tags: list[str]
    metadata: dict[str, Any]
    status: CameraStatusEnum
    last_health_check_at: datetime | None = None
    health_status: CameraHealthStatusSchema | None = None
    created_at: datetime
    updated_at: datetime
    created_by: str | None = None
    deleted_at: datetime | None = None


class CameraListResponseSchema(SentinelBaseModel):
    """Paginated camera list response."""

    items: list[CameraResponseSchema]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Bulk Import ───────────────────────────────────────────────────────────────

class CameraBulkImportSchema(SentinelBaseModel):
    """Bulk import request — up to 10,000 cameras."""

    cameras: list[CameraCreateSchema] = Field(..., min_length=1, max_length=10000)
    skip_duplicates: bool = False
    dry_run: bool = False


class BulkImportErrorSchema(SentinelBaseModel):
    row: int
    camera_id: str | None = None
    error: str


class BulkImportResultSchema(SentinelBaseModel):
    """Result of bulk import with per-row error reporting."""

    total: int
    succeeded: int
    failed: int
    skipped: int
    errors: list[BulkImportErrorSchema] = Field(default_factory=list)


# ── Department ────────────────────────────────────────────────────────────────

class DepartmentCreateSchema(SentinelBaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    contact_email: str | None = None
    contact_phone: str | None = Field(None, pattern=r"^\+?[0-9\-\s]{7,20}$")
    metadata: dict[str, Any] = Field(default_factory=dict)


class DepartmentSchema(SentinelBaseModel):
    id: uuid.UUID
    code: str
    name: str
    contact_email: str | None = None
    contact_phone: str | None = None
    metadata: dict[str, Any]
    camera_count: int = 0
    created_at: datetime


class DepartmentListResponseSchema(SentinelBaseModel):
    departments: list[DepartmentSchema]
    total: int


# ── GIS ───────────────────────────────────────────────────────────────────────

class GeoJSONPointSchema(SentinelBaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(..., min_length=2, max_length=3)


class GeoJSONFeatureSchema(SentinelBaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any]
    id: str | None = None


class GeoJSONFeatureCollectionSchema(SentinelBaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[GeoJSONFeatureSchema]


class GapZoneSchema(SentinelBaseModel):
    district: str | None = None
    area_km2: float
    centroid_lat: float
    centroid_lon: float
    nearest_camera_id: str | None = None
    nearest_camera_distance_m: float | None = None


class GapAnalysisResultSchema(SentinelBaseModel):
    total_area_km2: float
    covered_area_km2: float
    gap_area_km2: float
    coverage_percent: float
    gap_zones: GeoJSONFeatureCollectionSchema
    district_breakdown: list[dict[str, Any]]


class HexbinSchema(SentinelBaseModel):
    h3_index: str
    count: int
    center: GeoJSONPointSchema


class HeatmapResultSchema(SentinelBaseModel):
    resolution: int
    hexbins: list[HexbinSchema]


class DistrictStatsSchema(SentinelBaseModel):
    name: str
    camera_count: int
    online_count: int
    offline_count: int
    coverage_percent: float | None = None


class DistrictListResponseSchema(SentinelBaseModel):
    districts: list[DistrictStatsSchema]


# ── Audit ─────────────────────────────────────────────────────────────────────

class AuditEntrySchema(SentinelBaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    action: str
    actor_id: str
    actor_ip: str | None = None
    diff: dict[str, Any]
    context: dict[str, Any]
    timestamp: datetime


class AuditTrailResponseSchema(SentinelBaseModel):
    items: list[AuditEntrySchema]
    total: int
    page: int
    page_size: int


# ── System ────────────────────────────────────────────────────────────────────

class HealthResponseSchema(SentinelBaseModel):
    status: Literal["healthy", "unhealthy"]
    service: str
    version: str
    timestamp: datetime


class ReadinessCheckSchema(SentinelBaseModel):
    status: Literal["ok", "error"]
    message: str | None = None


class ReadinessResponseSchema(SentinelBaseModel):
    ready: bool
    checks: dict[str, ReadinessCheckSchema]


# ── Error ─────────────────────────────────────────────────────────────────────

class ErrorDetailSchema(SentinelBaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None
    trace_id: str | None = None


# ── Query parameters ──────────────────────────────────────────────────────────

class CameraListParams(SentinelBaseModel):
    """Query parameters for camera list endpoint."""

    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=1000)
    department_id: uuid.UUID | None = None
    status: CameraStatusEnum | None = None
    camera_type: CameraTypeEnum | None = None
    district: str | None = None
    search: str | None = None
    bbox: str | None = Field(
        None,
        description="min_lon,min_lat,max_lon,max_lat",
        pattern=r"^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$",
    )

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def bbox_coords(self) -> tuple[float, float, float, float] | None:
        """Parse bbox string into (min_lon, min_lat, max_lon, max_lat)."""
        if self.bbox is None:
            return None
        parts = [float(x) for x in self.bbox.split(",")]
        return (parts[0], parts[1], parts[2], parts[3])
