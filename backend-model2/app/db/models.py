"""
Gujarat Sentinel — Model 2
Database models for ANPR detections, watchlist, and stream state.

Separate from Model 1 — each model has its own database schema.
Detection data is also indexed into OpenSearch for full-text search.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ── Enums ─────────────────────────────────────────────────────────────────────

class StreamStatusEnum(str, enum.Enum):
    live = "live"
    offline = "offline"
    connecting = "connecting"
    reconnecting = "reconnecting"
    error = "error"


class VehicleTypeEnum(str, enum.Enum):
    car = "car"
    truck = "truck"
    bus = "bus"
    motorcycle = "motorcycle"
    auto_rickshaw = "auto_rickshaw"
    other = "other"
    unknown = "unknown"


class WatchlistTypeEnum(str, enum.Enum):
    stolen_vehicle = "stolen_vehicle"
    wanted_person = "wanted_person"
    missing_person = "missing_person"
    blacklisted_vehicle = "blacklisted_vehicle"
    suspect = "suspect"


class AlertPriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class EventTypeEnum(str, enum.Enum):
    vehicle_detected = "vehicle_detected"
    anpr_read = "anpr_read"
    person_detected = "person_detected"
    crowd_detected = "crowd_detected"
    intrusion = "intrusion"
    anomaly = "anomaly"
    watchlist_hit = "watchlist_hit"


# ── Stream State ──────────────────────────────────────────────────────────────

class StreamState(Base):
    """
    Tracks the RTSP consumer state for each camera stream.
    The actual RTSP connection is managed in-memory by the stream manager;
    this table persists the state across service restarts.
    """
    __tablename__ = "stream_states"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"),
    )
    stream_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    camera_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    rtsp_url: Mapped[str] = mapped_column(Text, nullable=False)
    hls_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    webrtc_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    codec: Mapped[str | None] = mapped_column(String(20), nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(20), nullable=True)
    frame_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bitrate_kbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[StreamStatusEnum] = mapped_column(
        Enum(StreamStatusEnum, name="stream_status_enum"),
        nullable=False, default=StreamStatusEnum.offline,
    )
    analytics_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    department: Mapped[str | None] = mapped_column(String(20), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_frame_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reconnect_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )


# ── ANPR Detection ────────────────────────────────────────────────────────────

class ANPRDetection(Base):
    """
    Individual ANPR plate read event.

    High-volume table: one row per plate detection.
    Indexed by plate_number and timestamp for fast route reconstruction.
    Also mirrored to OpenSearch for full-text search.
    """
    __tablename__ = "anpr_detections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"),
    )
    camera_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    stream_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    plate_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    plate_number_normalised: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True,
    )
    pts_ms: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # Bounding box (plate region in frame)
    bbox_x: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bbox_y: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bbox_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bbox_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Vehicle info (from YOLOv8)
    vehicle_type: Mapped[VehicleTypeEnum | None] = mapped_column(
        Enum(VehicleTypeEnum, name="vehicle_type_enum"), nullable=True,
    )
    vehicle_color: Mapped[str | None] = mapped_column(String(30), nullable=True)
    vehicle_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Location denormalised from stream
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Snapshot
    snapshot_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    plate_crop_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # VAHAN cross-reference
    vahan_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    is_stolen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Processing metadata
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    __table_args__ = (
        Index("idx_anpr_plate_time", "plate_number_normalised", "timestamp"),
        Index("idx_anpr_camera_time", "camera_id", "timestamp"),
        Index("idx_anpr_stolen", "is_stolen", postgresql_where=text("is_stolen = true")),
        Index("idx_anpr_blacklisted", "is_blacklisted", postgresql_where=text("is_blacklisted = true")),
    )


# ── Watchlist ─────────────────────────────────────────────────────────────────

class WatchlistEntry(Base):
    """
    Watch list for vehicles and persons to alert on detection.
    Synced from eGujCop and can be manually managed via API.
    """
    __tablename__ = "watchlist"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"),
    )
    type: Mapped[WatchlistTypeEnum] = mapped_column(
        Enum(WatchlistTypeEnum, name="watchlist_type_enum"), nullable=False, index=True,
    )
    identifier: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    identifier_normalised: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    case_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority: Mapped[AlertPriorityEnum] = mapped_column(
        Enum(AlertPriorityEnum, name="alert_priority_enum"),
        nullable=False, default=AlertPriorityEnum.medium,
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    alerts: Mapped[list["WatchlistAlert"]] = relationship(
        "WatchlistAlert", back_populates="watchlist_entry", lazy="select",
    )

    __table_args__ = (
        UniqueConstraint("type", "identifier_normalised", name="uq_watchlist_type_identifier"),
    )


# ── Watchlist Alert ───────────────────────────────────────────────────────────

class WatchlistAlert(Base):
    """
    Generated when an ANPR detection matches a watchlist entry.
    Alerts are displayed in the dashboard and pushed via Kafka.
    """
    __tablename__ = "watchlist_alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"),
    )
    watchlist_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("watchlist.id"), nullable=False, index=True,
    )
    watchlist_entry: Mapped["WatchlistEntry"] = relationship(
        "WatchlistEntry", back_populates="alerts",
    )
    detection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True,
    )
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    plate_number: Mapped[str] = mapped_column(String(20), nullable=False)
    camera_id: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[AlertPriorityEnum] = mapped_column(
        Enum(AlertPriorityEnum, name="alert_priority_enum", create_constraint=False),
        nullable=False,
    )
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    snapshot_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    __table_args__ = (
        Index("idx_alerts_unack", "is_acknowledged", "triggered_at",
              postgresql_where=text("is_acknowledged = false")),
    )
