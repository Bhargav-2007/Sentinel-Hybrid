"""Configuration settings for AI Detection and ANPR Engine."""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Service Information
    APP_NAME: str = "Gujarat Sentinel AI Detection & ANPR Engine"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    PORT: int = 8006
    HOST: str = "0.0.0.0"

    # YOLO Weights Paths
    YOLO_MODEL_NAME: str = os.getenv("YOLO_MODEL_NAME", "yolov8n.pt")  # yolov8n.pt / yolo11n.pt / custom
    PLATE_MODEL_PATH: Optional[str] = os.getenv("PLATE_MODEL_PATH", "models/license_plate_yolo.pt")
    
    # Inference Thresholds
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45
    ANPR_CONFIDENCE_THRESHOLD: float = 0.40

    # Class Filters for Person + Vehicle Detection (COCO IDs: 0=person, 1=bicycle, 2=car, 3=motorcycle, 5=bus, 7=truck)
    TARGET_CLASS_IDS: List[int] = [0, 1, 2, 3, 5, 7]
    TARGET_CLASS_NAMES: List[str] = ["person", "bicycle", "car", "motorcycle", "bus", "truck"]

    # OCR Engine Choice: "paddleocr" (preferred) or "easyocr"
    OCR_ENGINE: str = os.getenv("OCR_ENGINE", "paddleocr")
    OCR_LANGUAGES: List[str] = ["en"]

    # ByteTrack Tracker Parameters
    TRACK_HIGH_THRESH: float = 0.5
    TRACK_LOW_THRESH: float = 0.1
    NEW_TRACK_THRESH: float = 0.6
    TRACK_BUFFER: int = 30
    MATCH_THRESH: float = 0.8

    # Live Stream Defaults (Gujarat Sentinel Sandbox)
    DEFAULT_STREAM_HOST: str = "live.corp8.cloud"
    DEFAULT_RTSP_PORT: int = 8554

    # Device: "cuda", "mps", "cpu", or "auto"
    DEVICE: str = os.getenv("AI_DEVICE", "auto")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
