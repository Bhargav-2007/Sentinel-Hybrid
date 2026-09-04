"""Camera schemas for inventory, stream endpoints, and GeoJSON GIS integration."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.camera import CameraStatus, CameraType


class CameraBase(BaseModel):
    name: str = Field(..., examples=["SG Highway Junction Cam-01"])
    location_name: str = Field(..., examples=["SG Highway & Prahladnagar Crossroad, Ahmedabad"])
    district: str = Field(..., examples=["Ahmedabad City"])
    station: Optional[str] = Field("Navrangpura Police Station", examples=["Navrangpura Police Station"])
    zone: Optional[str] = Field("West Zone", examples=["West Zone"])
    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[23.0225])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[72.5714])
    camera_type: CameraType = Field(default=CameraType.ANPR)
    vms_vendor: str = Field(default="CORP8_LIVE_GATEWAY")
    department_id: Optional[str] = None


class CameraCreate(CameraBase):
    stream_id: str = Field(..., description="Numeric or string ID in official Sentinel sandbox", examples=["1"])
    camera_code: str = Field(..., examples=["CAM-AHM-01"])
    rtsp_url: str = Field(..., examples=["rtsp://live.corp8.cloud:8554/stream/1"])
    webrtc_url: str = Field(..., examples=["http://live.corp8.cloud:8889/stream/1/whep"])
    hls_url: str = Field(..., examples=["https://live.corp8.cloud/live/stream/1/index.m3u8"])
    codec: Optional[str] = "h264"
    fps: Optional[int] = 25
    resolution: Optional[str] = "1920x1080"
    bitrate_kbps: Optional[int] = 4000
    extra_metadata: Optional[Dict[str, Any]] = None


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location_name: Optional[str] = None
    district: Optional[str] = None
    station: Optional[str] = None
    status: Optional[CameraStatus] = None
    camera_type: Optional[CameraType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    department_id: Optional[str] = None
    rtsp_url: Optional[str] = None
    webrtc_url: Optional[str] = None
    hls_url: Optional[str] = None


class CameraResponse(CameraBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stream_id: str
    camera_code: str
    status: CameraStatus
    rtsp_url: str
    webrtc_url: str
    hls_url: str
    codec: Optional[str] = None
    fps: Optional[int] = None
    resolution: Optional[str] = None
    bitrate_kbps: Optional[int] = None
    is_live: bool
    created_at: datetime
    updated_at: datetime


class CameraGeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class CameraGeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[CameraGeoJSONFeature]


class CameraOnboardingBatch(BaseModel):
    """Batch payload for onboarding up to ~50 cameras simultaneously."""
    cameras: List[CameraCreate]
