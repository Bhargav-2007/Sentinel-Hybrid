"""
Gujarat Sentinel — Model 1: CCTV Registry & GIS
Database models (SQLAlchemy 2 + PostGIS via GeoAlchemy2)

Design decisions:
  - All tables use UUID primary keys (uuid_generate_v4() from pgcrypto)
  - Soft deletes via deleted_at (NULL = active, timestamp = deleted)
  - PostGIS GEOMETRY(Point, 4326) for spatial indexing and queries
  - JSONB for flexible metadata (department-specific fields)
  - All timestamps stored as TIMESTAMPTZ (UTC)
  - Audit trail stored in separate table (append-only, no updates)
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
UUID = Uuid
JSONB = JSON
ARRAY = lambda item_type: JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# ── Enums ─────────────────────────────────────────────────────────────────────

import enum


class CameraStatusEnum(str, enum.Enum):
    online = "online"
    offline = "offline"
    degraded = "degraded"
    maintenance = "maintenance"
    decommissioned = "decommissioned"
    unknown = "unknown"


class CameraTypeEnum(str, enum.Enum):
    dome = "dome"
    bullet = "bullet"
    ptz = "ptz"
    fisheye = "fisheye"
    thermal = "thermal"
    box = "box"
    analogue_ip_converter = "analogue_ip_converter"


class StorageTypeEnum(str, enum.Enum):
    cloud = "cloud"
    local_nvr = "local_nvr"
    edge_device = "edge_device"
    no_storage = "no_storage"


class ProtocolEnum(str, enum.Enum):
    rtsp = "rtsp"
    onvif = "onvif"
    sdk = "sdk"
    http_mjpeg = "http_mjpeg"
    hls = "hls"
    rtmp = "rtmp"
    webrtc = "webrtc"


class CodecEnum(str, enum.Enum):
    h264 = "h264"
    h265 = "h265"
    mjpeg = "mjpeg"
    mpeg4 = "mpeg4"
    av1 = "av1"


class AuditActionEnum(str, enum.Enum):
    create = "create"
    update = "update"
    delete = "delete"
    bulk_import = "bulk_import"
    health_check = "health_check"
    status_change = "status_change"


# ── Department ────────────────────────────────────────────────────────────────

class Department(Base):
    """
    Represents a government department that owns cameras.
    26 departments currently operate independent CCTV systems.
    """

    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    cameras: Mapped[list["Camera"]] = relationship(
        "Camera", back_populates="department", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Department {self.code}: {self.name}>"


# ── Camera ────────────────────────────────────────────────────────────────────

class Camera(Base):
    """
    Central camera registry entity.

    Key design choices:
    - camera_id is the department-assigned ID (HP-AHM-001), globally unique
    - location is a PostGIS Point(WGS84) for spatial queries
    - rtsp_url is stored — in production this would be encrypted (pgcrypto)
    - JSONB metadata allows dept-specific fields without schema migration
    - Soft delete via deleted_at preserves audit history
    """

    __tablename__ = "cameras"

    # Primary key (platform internal UUID)
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Department-assigned identifier (must be unique per deployment)
    camera_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

    # Owning department
    department_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("departments.id"), nullable=False, index=True
    )
    department: Mapped["Department"] = relationship("Department", back_populates="cameras")

    # Basic metadata
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # ── Location ──────────────────────────────────────────────────────────────
    location: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default="POINT(72.5714 23.0225)",
    )
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    altitude_meters: Mapped[float | None] = mapped_column(nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    taluka: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(6), nullable=True)

    # ── Technical specifications ──────────────────────────────────────────────
    camera_type: Mapped[CameraTypeEnum] = mapped_column(
        Enum(CameraTypeEnum, name="camera_type_enum"),
        nullable=False,
        index=True,
    )
    protocol: Mapped[ProtocolEnum | None] = mapped_column(
        Enum(ProtocolEnum, name="protocol_enum"),
        nullable=True,
    )
    codec: Mapped[CodecEnum | None] = mapped_column(
        Enum(CodecEnum, name="codec_enum"),
        nullable=True,
    )
    resolution: Mapped[str | None] = mapped_column(String(20), nullable=True)
    frame_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Stream URLs — in production: pgp_sym_encrypt(rtsp_url, secret_key)
    rtsp_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    onvif_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Hardware / vendor info ────────────────────────────────────────────────
    vendor: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    install_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    amc_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    # ── Storage ───────────────────────────────────────────────────────────────
    storage_type: Mapped[StorageTypeEnum | None] = mapped_column(
        Enum(StorageTypeEnum, name="storage_type_enum"),
        nullable=True,
    )
    retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Operational status ────────────────────────────────────────────────────
    status: Mapped[CameraStatusEnum] = mapped_column(
        Enum(CameraStatusEnum, name="camera_status_enum"),
        nullable=False,
        default=CameraStatusEnum.unknown,
        index=True,
    )
    last_health_check_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Classification ────────────────────────────────────────────────────────
    is_public_domain: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)

    # ── Flexible metadata (JSONB) ─────────────────────────────────────────────
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, default=dict, nullable=False)

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    created_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # Relationships
    health_checks: Mapped[list["CameraHealthCheck"]] = relationship(
        "CameraHealthCheck", back_populates="camera", lazy="select", order_by="CameraHealthCheck.checked_at.desc()"
    )

    __table_args__ = (
        # Index for district-based filtering
        Index("idx_cameras_district", "district"),
        # Index for status + deleted_at (most common filter)
        Index("idx_cameras_status_active", "status", "deleted_at"),
        # Only one active record per camera_id
        UniqueConstraint("camera_id", name="uq_cameras_camera_id"),
    )

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None

    def __repr__(self) -> str:
        return f"<Camera {self.camera_id}: {self.name} [{self.status}]>"


# ── Camera Health Check ───────────────────────────────────────────────────────

class CameraHealthCheck(Base):
    """
    Time-series health check records for each camera.

    Background worker probes cameras on a configurable interval
    and writes a record here. Retains only the last 30 records per camera
    (pruned by the worker). The latest record is cached in Redis.
    """

    __tablename__ = "camera_health_checks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    camera_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("cameras.id"), nullable=False, index=True
    )
    camera: Mapped["Camera"] = relationship("Camera", back_populates="health_checks")

    is_reachable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stream_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    check_method: Mapped[str] = mapped_column(String(20), nullable=False)  # rtsp_probe | ping | api
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    __table_args__ = (
        Index("idx_health_camera_checked_at", "camera_id", "checked_at"),
    )


# ── Audit Trail ───────────────────────────────────────────────────────────────

class AuditEntry(Base):
    """
    Append-only audit trail for all camera/department mutations.

    Never update or delete rows from this table.
    Retained for at least 365 days per AUDIT_RETENTION_DAYS policy.
    """

    __tablename__ = "audit_trail"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, index=True)
    action: Mapped[AuditActionEnum] = mapped_column(
        Enum(AuditActionEnum, name="audit_action_enum"), nullable=False, index=True
    )
    actor_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    actor_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max 45 chars

    # JSON diff of changed fields (before → after)
    diff: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    # Additional context (e.g., bulk import batch ID, reason)
    context: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    __table_args__ = (
        Index("idx_audit_entity_timestamp", "entity_type", "entity_id", "timestamp"),
        Index("idx_audit_actor_timestamp", "actor_id", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<AuditEntry {self.action} on {self.entity_type}:{self.entity_id} by {self.actor_id}>"


# ── Coverage Zone ─────────────────────────────────────────────────────────────

class CoverageZone(Base):
    """
    Predefined monitoring zones for gap analysis.
    These represent planned coverage areas (e.g., intersections,
    border zones) that should have camera coverage.
    """

    __tablename__ = "coverage_zones"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    zone_type: Mapped[str] = mapped_column(String(50), nullable=False)  # district | intersection | border
    district: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    boundary: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("idx_zones_district", "district"),
    )
