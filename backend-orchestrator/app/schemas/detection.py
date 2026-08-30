from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class DetectionCreate(BaseModel):
    camera_id: str
    detected_plate: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    vehicle_type: Optional[str] = "CAR"
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    bbox: Optional[List[float]] = None
    pts_timestamp_ms: Optional[int] = None
    snapshot_url: Optional[str] = None
    plate_crop_url: Optional[str] = None


class DetectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    camera_id: str
    detected_plate: str
    clean_plate: str
    confidence_score: float
    vehicle_type: str
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    vehicle_color: Optional[str]
    bbox: Optional[List[float]]
    pts_timestamp_ms: Optional[int]
    snapshot_url: Optional[str]
    plate_crop_url: Optional[str]
    ai_model_source: str
    detected_at: datetime


class AnprQuery(BaseModel):
    plate: Optional[str] = None
    camera_id: Optional[str] = None
    district: Optional[str] = None
    min_confidence: float = 0.80
    limit: int = 50
    offset: int = 0
