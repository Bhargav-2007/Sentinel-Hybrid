"""
Gujarat Sentinel — Model 2
Pydantic v2 schemas for ANPR, streams, watchlist, and events
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.models import (
    AlertPriorityEnum,
    EventTypeEnum,
    StreamStatusEnum,
    VehicleTypeEnum,
    WatchlistTypeEnum,
)


class M2BaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True, use_enum_values=True,
        str_strip_whitespace=True, populate_by_name=True,
        protected_namespaces=(),
    )


# ── Stream Schemas ────────────────────────────────────────────────────────────

class StreamLocationSchema(M2BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    district: str | None = None
    address: str | None = None


class StreamDetailSchema(M2BaseModel):
    id: str
    camera_id: str
    name: str
    status: StreamStatusEnum
    rtsp_url: str
    hls_url: str | None = None
    webrtc_url: str | None = None
    codec: str | None = None
    resolution: str | None = None
    frame_rate: int | None = None
    bitrate_kbps: int | None = None
    location: StreamLocationSchema | None = None
    analytics_active: bool = False
    last_frame_at: datetime | None = None
    department: str | None = None
    reconnect_count: int = 0
    error_message: str | None = None


class StreamCatalogueResponseSchema(M2BaseModel):
    streams: list[StreamDetailSchema]
    total: int
    active_count: int


class StreamConnectResponseSchema(M2BaseModel):
    stream_id: str
    status: StreamStatusEnum
    analytics_pipeline: bool
    message: str


# ── ANPR Schemas ──────────────────────────────────────────────────────────────

class BoundingBoxSchema(M2BaseModel):
    x: int
    y: int
    width: int
    height: int


class ANPRDetectionSchema(M2BaseModel):
    id: uuid.UUID
    camera_id: str
    stream_id: str
    plate_number: str
    confidence: float
    timestamp: datetime
    pts_ms: int | None = None
    bounding_box: BoundingBoxSchema | None = None
    vehicle_type: VehicleTypeEnum | None = None
    vehicle_color: str | None = None
    vehicle_confidence: float | None = None
    location: StreamLocationSchema | None = None
    snapshot_url: str | None = None
    plate_crop_url: str | None = None
    is_stolen: bool = False
    is_blacklisted: bool = False
    processing_time_ms: int | None = None


class DetectionListResponseSchema(M2BaseModel):
    items: list[ANPRDetectionSchema]
    total: int
    page: int
    page_size: int


class DetectionDetailSchema(ANPRDetectionSchema):
    """Extended detection with VAHAN data."""
    vahan_data: dict[str, Any] | None = None
    model_version: str | None = None


class VehicleMovementHistorySchema(M2BaseModel):
    plate_number: str
    total_detections: int
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    cameras_seen: int = 0
    districts_traversed: list[str] = Field(default_factory=list)
    detections: list[ANPRDetectionSchema]


# ── Watchlist Schemas ─────────────────────────────────────────────────────────

class WatchlistCreateSchema(M2BaseModel):
    type: WatchlistTypeEnum
    identifier: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    case_number: str | None = None
    priority: AlertPriorityEnum = AlertPriorityEnum.medium
    source: str = "manual"
    source_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    expires_at: datetime | None = None

    @field_validator("identifier")
    @classmethod
    def normalise_identifier(cls, v: str) -> str:
        return re.sub(r"\s+", " ", v.strip().upper())


class WatchlistEntrySchema(M2BaseModel):
    id: uuid.UUID
    type: WatchlistTypeEnum
    identifier: str
    description: str | None = None
    case_number: str | None = None
    priority: AlertPriorityEnum
    source: str
    source_id: str | None = None
    is_active: bool
    metadata: dict[str, Any]
    created_at: datetime
    expires_at: datetime | None = None
    alert_count: int = 0


class WatchlistListResponseSchema(M2BaseModel):
    items: list[WatchlistEntrySchema]
    total: int
    page: int
    page_size: int


# ── Alert Schemas ─────────────────────────────────────────────────────────────

class WatchlistAlertSchema(M2BaseModel):
    id: uuid.UUID
    watchlist_entry_id: uuid.UUID
    detection_id: uuid.UUID
    alert_type: str
    plate_number: str
    camera_id: str
    priority: AlertPriorityEnum
    location: StreamLocationSchema | None = None
    snapshot_url: str | None = None
    is_acknowledged: bool = False
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None
    triggered_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class AlertListResponseSchema(M2BaseModel):
    items: list[WatchlistAlertSchema]
    total: int
    unacknowledged_count: int
    page: int
    page_size: int


# ── Event Schemas ─────────────────────────────────────────────────────────────

class EventSchema(M2BaseModel):
    id: str
    event_type: EventTypeEnum
    camera_id: str
    stream_id: str | None = None
    timestamp: datetime
    data: dict[str, Any]
    tags: list[str] = Field(default_factory=list)


class EventListResponseSchema(M2BaseModel):
    items: list[EventSchema]
    total: int
    page: int
    page_size: int


# ── Utility ───────────────────────────────────────────────────────────────────

def normalise_plate(plate: str) -> str:
    """
    Normalise Indian license plate to canonical form.
    GJ 01 AB 1234 → GJ01AB1234 (no spaces, uppercase).
    """
    return re.sub(r"[^A-Z0-9]", "", plate.strip().upper())
