"""State Department database model for multi-department CCTV segregation."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Department(Base):
    """
    Represents a State Government Department (e.g., Gujarat Police, Transport/RTO,
    Ahmedabad Municipal Corporation, Roads & Buildings, Forest & Wildlife).
    Enables department-wise camera grouping, data segregation, and customized information views.
    """
    __tablename__ = "departments"

    id = Column(String(64), primary_key=True, index=True)
    code = Column(String(32), unique=True, index=True, nullable=False) # e.g. POLICE, RTO, AMC, BORDER
    name = Column(String(128), nullable=False)                         # e.g. Gujarat Police Crime Branch
    description = Column(String(256), nullable=True)
    nodal_officer = Column(String(128), nullable=True)
    contact_email = Column(String(128), nullable=True)
    contact_phone = Column(String(32), nullable=True)
    jurisdiction_level = Column(String(64), default="Statewide")       # Statewide | District | Municipal
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    cameras = relationship("Camera", back_populates="department")
    officers = relationship("Officer", back_populates="department")
