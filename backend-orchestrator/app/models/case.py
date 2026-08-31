"""
Gujarat Sentinel — Case Investigation & Forensic Lifecycle Database Model.
Implements the operational lifecycle:
ALERT -> ACKNOWLEDGED -> INVESTIGATION OPENED -> CASE CREATED -> EVIDENCE COLLECTED -> REVIEW -> RESOLVED/CLOSED
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    EVIDENCE_COLLECTED = "EVIDENCE_COLLECTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class CasePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True)
    case_number = Column(String(64), unique=True, index=True, nullable=False) # e.g. CASE-2026-00127
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    fir_number = Column(String(64), index=True, nullable=True)
    
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN, nullable=False, index=True)
    priority = Column(Enum(CasePriority), default=CasePriority.HIGH, nullable=False)
    
    # Associated Alert Incident (Optional if created from live alert)
    alert_id = Column(String(64), nullable=True, index=True)
    
    # Target Entities
    target_plate = Column(String(32), index=True, nullable=True)
    target_vehicle_make = Column(String(64), nullable=True)
    target_vehicle_model = Column(String(64), nullable=True)
    target_vehicle_color = Column(String(64), nullable=True)
    target_person_description = Column(String(256), nullable=True)
    
    # Location & Jurisdiction
    district = Column(String(64), default="Ahmedabad City", index=True)
    station = Column(String(128), default="Navrangpura Police Station")
    primary_latitude = Column(Float, nullable=True)
    primary_longitude = Column(Float, nullable=True)
    
    # Assignment
    assigned_officer_id = Column(String(64), ForeignKey("officers.id"), nullable=False)
    assigned_officer_badge = Column(String(64), nullable=False)
    assigned_officer_name = Column(String(128), nullable=False)
    supervisor_id = Column(String(64), nullable=True)
    
    # Forensic Evidence & Multi-Camera Sightings Payload
    sightings = Column(JSON, default=list, nullable=True) # list of {camera_id, camera_name, timestamp, pts, speed_kmh, lat, lng}
    evidence_packages = Column(JSON, default=list, nullable=True) # list of evidence package references
    snapshots = Column(JSON, default=list, nullable=True) # list of image URLs
    video_clips = Column(JSON, default=list, nullable=True) # list of video URLs in MinIO
    
    # Section 65B Legal Integrity Binding
    section65b_certificate_id = Column(String(64), nullable=True)
    hmac_sha256_signature = Column(String(128), nullable=True)
    
    # Case Notes & Audit Chronology
    case_notes = Column(JSON, default=list, nullable=True) # list of {author, timestamp, note, action}
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
