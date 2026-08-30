"""Officer and User security database model."""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class OfficerRole(str, enum.Enum):
    ADMIN = "ADMIN"
    SUPERVISOR = "SUPERVISOR"
    DUTY_OFFICER = "DUTY_OFFICER"
    INVESTIGATOR = "INVESTIGATOR"
    DISPATCHER = "DISPATCHER"


class Officer(Base):
    __tablename__ = "officers"

    id = Column(String(64), primary_key=True, index=True)
    officer_id = Column(String(64), unique=True, index=True, nullable=False)  # e.g. POLICE-AHM-042
    badge_number = Column(String(64), unique=True, index=True, nullable=False) # e.g. GJ-POL-8842
    full_name = Column(String(128), nullable=False)
    rank = Column(String(64), default="Sub-Inspector")
    district = Column(String(64), default="Ahmedabad City", index=True)
    station = Column(String(128), default="Navrangpura Police Station")
    hashed_password = Column(String(256), nullable=False)
    role = Column(Enum(OfficerRole), default=OfficerRole.DUTY_OFFICER, nullable=False)
    
    # Department association
    department_id = Column(String(64), ForeignKey("departments.id"), nullable=True)
    department = relationship("Department", back_populates="officers", lazy="selectin")
    
    is_active = Column(Boolean, default=True)
    is_on_duty = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Audit & Break-Glass relationships
    audit_logs = relationship("AuditLog", back_populates="officer")
    break_glass_sessions = relationship("BreakGlassSession", back_populates="officer")
