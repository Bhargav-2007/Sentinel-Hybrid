"""APB Alert Incidents database model."""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class AlertSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class AlertType(str, enum.Enum):
    STOLEN_VEHICLE = "STOLEN_VEHICLE"
    WANTED_SUSPECT = "WANTED_SUSPECT"
    HIT_AND_RUN = "HIT_AND_RUN"
    BLACK_LISTED = "BLACK_LISTED"
    SPEED_VIOLATION = "SPEED_VIOLATION"
    WRONG_WAY = "WRONG_WAY"
    PERIMETER_BREACH = "PERIMETER_BREACH"
    CROWD_ANOMALY = "CROWD_ANOMALY"


class AlertIncident(Base):
    __tablename__ = "alert_incidents"

    id = Column(String(64), primary_key=True, index=True)
    incident_number = Column(String(64), unique=True, index=True, nullable=False) # e.g. APB-2026-08842
    
    alert_type = Column(Enum(AlertType), nullable=False, index=True)
    severity = Column(Enum(AlertSeverity), nullable=False, index=True)
    status = Column(Enum(AlertStatus), default=AlertStatus.NEW, index=True)
    
    title = Column(String(256), nullable=False)
    description = Column(String(512), nullable=False)
    
    # Camera & Spatial Context
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False, index=True)
    camera_name = Column(String(128), nullable=False)
    district = Column(String(64), nullable=False, index=True)
    station = Column(String(128), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Vehicle Details
    detected_plate = Column(String(32), index=True, nullable=True)
    vehicle_make = Column(String(64), nullable=True)
    vehicle_model = Column(String(64), nullable=True)
    vehicle_color = Column(String(32), nullable=True)
    confidence_score = Column(Float, default=0.95)
    
    # Evidence & Snapshots
    snapshot_url = Column(String(512), nullable=True)
    video_clip_url = Column(String(512), nullable=True)
    
    # Legal & Police Workflow Details
    fir_number = Column(String(64), nullable=True)
    watchlist_tag = Column(String(128), nullable=True)
    assigned_officer = Column(String(128), nullable=True)
    acknowledged_by = Column(String(128), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(128), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Section 65B Digital Evidence Stamp
    section65b_hmac_hash = Column(String(128), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    camera = relationship("Camera", back_populates="alerts")
