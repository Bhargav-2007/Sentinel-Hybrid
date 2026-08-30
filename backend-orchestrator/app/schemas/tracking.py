from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class EncounterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    camera_id: str
    latitude: float
    longitude: float
    speed_kmh: Optional[float]
    confidence: float
    snapshot_url: Optional[str]
    pts_timestamp_ms: Optional[int]
    sighted_at: datetime


class TrajectoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    plate: str
    clean_plate: str
    first_seen_at: datetime
    last_seen_at: datetime
    total_sightings: int
    current_corridor: Optional[str]
    last_camera_id: Optional[str]
    last_location_name: Optional[str]
    last_latitude: Optional[float]
    last_longitude: Optional[float]
    path_geojson: List[Dict[str, Any]]
    encounters: List[EncounterResponse] = []


class CorridorSpeedResponse(BaseModel):
    corridor_name: str
    vehicle_plate: str
    start_camera_id: str
    end_camera_id: str
    distance_km: float
    elapsed_time_seconds: float
    pts_delta_seconds: float
    estimated_speed_kmh: float
    is_speeding: bool
    speed_limit_kmh: float
