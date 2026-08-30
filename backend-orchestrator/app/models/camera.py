"""Camera inventory and VMS integration database model."""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class CameraStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    DEGRADED = "DEGRADED"
    MAINTENANCE = "MAINTENANCE"


class CameraType(str, enum.Enum):
    ANPR = "ANPR"
    PTZ = "PTZ"
    BULLET = "BULLET"
    DOME = "DOME"
    THERMAL = "THERMAL"


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True, index=True)               # e.g. "1", "2", ... "50"
    stream_id = Column(String(32), unique=True, index=True, nullable=False) # e.g. "1" for /stream/1
    camera_code = Column(String(64), unique=True, index=True, nullable=False) # e.g. CAM-AHM-01
    name = Column(String(128), nullable=False)
    location_name = Column(String(256), nullable=False)
    district = Column(String(64), index=True, nullable=False)           # Ahmedabad, Surat, etc.
    station = Column(String(128), nullable=True)
    zone = Column(String(64), default="Central Zone")
    
    # Coordinates (Spatial GIS)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    
    # State & Capabilities
    status = Column(Enum(CameraStatus), default=CameraStatus.ONLINE, index=True)
    camera_type = Column(Enum(CameraType), default=CameraType.ANPR, index=True)
    vms_vendor = Column(String(64), default="CORP8_LIVE_GATEWAY")       # HIKVISION, DAHUA, CORP8_LIVE_GATEWAY
    
    # Official Sentinel Stream Protocols
    rtsp_url = Column(String(512), nullable=False)                     # rtsp://live.corp8.cloud:8554/stream/{id}
    webrtc_url = Column(String(512), nullable=False)                   # http://live.corp8.cloud:8889/stream/{id}/whep
    hls_url = Column(String(512), nullable=False)                      # https://live.corp8.cloud/live/stream/{id}/index.m3u8
    
    # Technical Parameters
    codec = Column(String(32), default="h264")                         # h264, h265
    fps = Column(Integer, default=25)
    resolution = Column(String(32), default="1920x1080")
    bitrate_kbps = Column(Integer, default=4000)
    is_live = Column(Boolean, default=True)
    
    # Department Association
    department_id = Column(String(64), ForeignKey("departments.id"), nullable=True, index=True)
    department = relationship("Department", back_populates="cameras")
    
    # Extended Metadata
    extra_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    detections = relationship("Detection", back_populates="camera", cascade="all, delete-orphan")
    alerts = relationship("AlertIncident", back_populates="camera")
    encounters = relationship("VehicleEncounter", back_populates="camera")
