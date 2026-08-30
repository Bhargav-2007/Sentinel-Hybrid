"""AI Vision and ANPR Detections database model."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base


class Detection(Base):
    __tablename__ = "detections"

    id = Column(String(64), primary_key=True, index=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), index=True, nullable=False)
    
    # ANPR & OCR Attributes
    detected_plate = Column(String(32), index=True, nullable=False)     # e.g. GJ01AB1234
    clean_plate = Column(String(32), index=True, nullable=False)        # normalized alphanumeric
    confidence_score = Column(Float, nullable=False)                   # e.g. 0.985
    
    # Classification
    vehicle_type = Column(String(32), default="CAR", index=True)        # CAR, SUV, TRUCK, MOTORCYCLE, BUS
    vehicle_make = Column(String(64), nullable=True)                   # Maruti, Hyundai, Tata
    vehicle_model = Column(String(64), nullable=True)                  # Swift, Creta, Nexon
    vehicle_color = Column(String(32), nullable=True)                  # White, Black, Silver
    
    # Bounding Box [x1, y1, x2, y2]
    bbox = Column(JSON, nullable=True)
    
    # Frame Presentation Timestamp (PTS Monotonic Standard)
    pts_timestamp_ms = Column(Integer, nullable=True)
    
    # Visual Evidence URLs (MinIO S3)
    snapshot_url = Column(String(512), nullable=True)
    plate_crop_url = Column(String(512), nullable=True)
    
    # Model Attribution
    ai_model_source = Column(String(64), default="MODEL2_YOLOV8_PADDLEOCR")
    
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    camera = relationship("Camera", back_populates="detections")
