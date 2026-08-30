"""Watchlists and Hotlist database model."""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, JSON
from app.core.database import Base


class WatchlistCategory(str, enum.Enum):
    STOLEN_VEHICLE = "STOLEN_VEHICLE"
    WANTED_SUSPECT = "WANTED_SUSPECT"
    SUSPICIOUS_TRANSIT = "SUSPICIOUS_TRANSIT"
    HIT_AND_RUN = "HIT_AND_RUN"
    BLACK_LISTED = "BLACK_LISTED"
    COURT_WARRANT = "COURT_WARRANT"


class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"

    id = Column(String(64), primary_key=True, index=True)
    category = Column(Enum(WatchlistCategory), nullable=False, index=True)
    
    # Target Identifier (Plate number, Suspect ID, or Chassis number)
    identifier = Column(String(64), unique=True, index=True, nullable=False) # e.g. GJ01AB1234
    clean_identifier = Column(String(64), index=True, nullable=False)
    
    reason = Column(String(256), nullable=False)
    case_number = Column(String(64), index=True, nullable=False)             # e.g. FIR-2026-CR-881
    police_station = Column(String(128), default="Crime Branch Gandhinagar")
    investigating_officer = Column(String(128), nullable=True)
    priority = Column(String(32), default="HIGH")                            # CRITICAL, HIGH, MEDIUM
    
    # Source Database Integration
    source_database = Column(String(64), default="eGujCop")                  # eGujCop, VAHAN, SARTHI, AFIS
    source_record_id = Column(String(64), nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)
    alert_count = Column(Integer, default=0)
    extra_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
