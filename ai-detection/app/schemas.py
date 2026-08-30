"""Pydantic schemas for AI Detection, ANPR, and Multi-Object Tracking APIs."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate")
    y1: float = Field(..., description="Top-left Y coordinate")
    x2: float = Field(..., description="Bottom-right X coordinate")
    y2: float = Field(..., description="Bottom-right Y coordinate")
    width: float = Field(..., description="Bounding box width")
    height: float = Field(..., description="Bounding box height")
    center_x: float = Field(..., description="Center X coordinate")
    center_y: float = Field(..., description="Center Y coordinate")


class DetectedObject(BaseModel):
    class_id: int = Field(..., description="COCO or Model class index")
    class_name: str = Field(..., description="Object label (person, car, truck, bus, motorcycle, bicycle)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    bbox: BoundingBox = Field(..., description="Spatial bounding box")
    track_id: Optional[int] = Field(None, description="Persistent ByteTrack object tracking ID")


class LicensePlateDetection(BaseModel):
    plate_number: str = Field(..., description="Normalized alphanumeric license plate string (e.g. GJ01AB1234)")
    formatted_plate: str = Field(..., description="Human-readable plate with state spacing (e.g. GJ 01 AB 1234)")
    raw_ocr_text: str = Field(..., description="Raw text output from PaddleOCR/EasyOCR")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR text recognition confidence")
    bbox: BoundingBox = Field(..., description="License plate bounding box")
    vehicle_track_id: Optional[int] = Field(None, description="Associated vehicle ByteTrack ID if linked")
    is_valid_indian_format: bool = Field(True, description="Conforms to standard Indian HSRP registration pattern")
    plate_crop_base64: Optional[str] = Field(None, description="Cropped high-resolution image of the license plate")


class ImageInputPayload(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded JPG/PNG frame")
    image_url: Optional[str] = Field(None, description="Direct URL to image or snapshot")
    stream_url: Optional[str] = Field(None, description="Live RTSP/HLS stream URL from live.corp8.cloud")
    camera_id: Optional[str] = Field("stream_1", description="Camera stream identifier")
    confidence_threshold: Optional[float] = Field(None, description="Override default confidence threshold")
    return_annotated_image: bool = Field(False, description="Return base64 encoded frame with drawn HUD visual boxes")


class PersonVehicleDetectionResponse(BaseModel):
    status: str = "success"
    camera_id: Optional[str] = None
    inference_time_ms: float
    total_people: int
    total_vehicles: int
    detections: List[DetectedObject]
    annotated_image_base64: Optional[str] = None


class AnprDetectionResponse(BaseModel):
    status: str = "success"
    camera_id: Optional[str] = None
    inference_time_ms: float
    total_plates_detected: int
    plates: List[LicensePlateDetection]
    annotated_image_base64: Optional[str] = None


class FullDetectionResponse(BaseModel):
    status: str = "success"
    camera_id: Optional[str] = None
    timestamp: str
    inference_time_ms: float
    counts: Dict[str, int]
    people_and_vehicles: List[DetectedObject]
    license_plates: List[LicensePlateDetection]
    annotated_image_base64: Optional[str] = None


class StreamFrameProcessRequest(BaseModel):
    stream_url: str = Field(..., examples=["rtsp://live.corp8.cloud:8554/stream/1"])
    camera_id: Optional[str] = Field("stream_1", examples=["stream_1"])
    detect_plates: bool = Field(True, description="Include ANPR license plate recognition")
    track_objects: bool = Field(True, description="Assign ByteTrack temporal tracking IDs")
    return_annotated_frame: bool = Field(True, description="Return processed frame with HUD overlay")


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    device: str
    gpu_available: bool
    gpu_device_name: Optional[str]
    models_loaded: Dict[str, bool]
    supported_classes: List[str]


class VehicleAttributeResult(BaseModel):
    track_id: Optional[int]
    vehicle_type: str
    dominant_color: str
    color_confidence: float
    direction: str
    estimated_speed_kmh: float
    motion_confidence: float
    bbox: BoundingBox


class VehicleAttributesResponse(BaseModel):
    status: str = "success"
    camera_id: str
    total_vehicles_profiled: int
    attributes: List[VehicleAttributeResult]


class AnomalyItem(BaseModel):
    anomaly_type: str
    severity: str
    confidence: float
    camera_id: str
    track_id: Optional[int] = None
    description: str
    bbox: Optional[BoundingBox] = None
    timestamp: float


class AnomalyDetectionResponse(BaseModel):
    status: str = "success"
    camera_id: str
    anomalies_detected: int
    anomalies: List[AnomalyItem]


class TemporalFusionRequest(BaseModel):
    camera_id: str = Field(..., examples=["CAM-01"])
    track_id: int = Field(..., examples=[42])
    plate_observations: List[str] = Field(..., examples=[["GJ01AB1234", "GJ01AB1234", "GJ01AB1284", "GJ01AB1234"]])
    confidences: Optional[List[float]] = None


class TemporalFusionResponse(BaseModel):
    status: str = "success"
    camera_id: str
    track_id: int
    fused_plate: str
    formatted_plate: str
    aggregate_confidence: float
    supporting_frames: int
    total_frames_evaluated: int
    support_ratio: float
    is_valid_indian_format: bool
    state_code: str
    rto_code: str
    character_confidences: List[float]


class ModelMetadataSchema(BaseModel):
    model_id: str
    name: str
    version: str
    purpose: str
    framework: str
    runtime: str
    license: str
    artifact_sha256: str
    map50: float
    precision: float
    recall: float
    f1_score: float
    latency_fp16_ms: float
    batch_size: int
    lifecycle_status: str


class ModelRegistryResponse(BaseModel):
    status: str = "success"
    total_models: int
    models: List[ModelMetadataSchema]
    hardware_status: Dict[str, Any]


class AICloudEventObservation(BaseModel):
    specversion: str = "1.0"
    id: str
    source: str
    type: str = "sentinel.ai.observation.v1"
    time: str
    subject: str
    data: Dict[str, Any]

