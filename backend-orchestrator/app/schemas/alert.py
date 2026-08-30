from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.alert import AlertSeverity, AlertStatus, AlertType


class AlertCreate(BaseModel):
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    camera_id: str
    camera_name: str
    district: str
    station: Optional[str] = None
    latitude: float
    longitude: float
    detected_plate: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    confidence_score: float = 0.95
    snapshot_url: Optional[str] = None
    video_clip_url: Optional[str] = None
    fir_number: Optional[str] = None
    watchlist_tag: Optional[str] = None


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    assigned_officer: Optional[str] = None
    fir_number: Optional[str] = None
    resolution_notes: Optional[str] = None


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_number: str
    alert_type: AlertType
    severity: AlertSeverity
    status: AlertStatus
    title: str
    description: str
    camera_id: str
    camera_name: str
    district: str
    station: Optional[str]
    latitude: float
    longitude: float
    detected_plate: Optional[str]
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    vehicle_color: Optional[str]
    confidence_score: float
    snapshot_url: Optional[str]
    video_clip_url: Optional[str]
    fir_number: Optional[str]
    watchlist_tag: Optional[str]
    assigned_officer: Optional[str]
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]
    section65b_hmac_hash: Optional[str]
    created_at: datetime
    updated_at: datetime


class AlertFilter(BaseModel):
    severity: Optional[AlertSeverity] = None
    status: Optional[AlertStatus] = None
    alert_type: Optional[AlertType] = None
    district: Optional[str] = None
    search: Optional[str] = None
    limit: int = 50
    offset: int = 0
