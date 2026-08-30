"""Vehicle Trajectory and Encounter Tracking database model."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base


class VehicleTrajectory(Base):
    __tablename__ = "vehicle_trajectories"

    id = Column(String(64), primary_key=True, index=True)
    plate = Column(String(32), unique=True, index=True, nullable=False)
    clean_plate = Column(String(32), index=True, nullable=False)
    
    first_seen_at = Column(DateTime(timezone=True), index=True)
    last_seen_at = Column(DateTime(timezone=True), index=True)
    total_sightings = Column(Integer, default=1)
    
    current_corridor = Column(String(128), nullable=True)
    last_camera_id = Column(String(64), nullable=True)
    last_location_name = Column(String(256), nullable=True)
    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    
    # JSON array of ordered checkpoint encounters: [{camera_id, lat, lng, time, pts, speed_kmh}]
    path_geojson = Column(JSON, default=list)
    
    # Relationships
    encounters = relationship("VehicleEncounter", back_populates="trajectory", cascade="all, delete-orphan")


class VehicleEncounter(Base):
    __tablename__ = "vehicle_encounters"

    id = Column(String(64), primary_key=True, index=True)
    trajectory_id = Column(String(64), ForeignKey("vehicle_trajectories.id"), index=True, nullable=False)
    camera_id = Column(String(64), ForeignKey("cameras.id"), index=True, nullable=False)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, nullable=True)
    confidence = Column(Float, default=0.98)
    snapshot_url = Column(String(512), nullable=True)
    pts_timestamp_ms = Column(Integer, nullable=True)
    
    sighted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    trajectory = relationship("VehicleTrajectory", back_populates="encounters")
    camera = relationship("Camera", back_populates="encounters")
