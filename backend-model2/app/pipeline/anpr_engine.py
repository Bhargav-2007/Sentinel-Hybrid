"""
Gujarat Sentinel — Model 2
ANPR Engine: YOLOv8n Detection + PaddleOCR Plate Reading

Pipeline per frame:
  1. YOLOv8n: detect vehicles (car, truck, bus, motorcycle) with bounding boxes
  2. Crop each detected vehicle region
  3. PaddleOCR: read license plate text from cropped region
  4. Validate plate against Indian format (GJ XX XX XXXX)
  5. Normalise plate string
  6. Check against in-memory watchlist cache
  7. Store detection + publish Kafka event

Design decisions:
  - CPU-only inference (no CUDA dependency)
  - YOLOv8n (nano) for speed: ~20ms/frame on modern CPU
  - PaddleOCR English model: ~50ms/plate region
  - Minimum plate width threshold (60px) to avoid OCR on tiny plates
  - Batch processing disabled to keep latency predictable
  - Indian plate regex validation filters false positives
"""

from __future__ import annotations

import io
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    import structlog
except ImportError:
    import logging as structlog

from PIL import Image

from app.config import get_settings

if hasattr(structlog, "get_logger"):
    logger = structlog.get_logger(__name__)
else:
    logger = structlog.getLogger(__name__)

# ── Indian License Plate Patterns ─────────────────────────────────────────────
# Standard Indian format: XX NN XX NNNN
# Gujarat examples: GJ 01 AB 1234, GJ 12 CD 5678
INDIAN_PLATE_PATTERN = re.compile(
    r"^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}$"
)
GUJARAT_PLATE_PATTERN = re.compile(
    r"^GJ\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4}$"
)

# YOLO COCO vehicle class IDs
VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

# Rough vehicle colour detection ranges (HSV)
COLOR_RANGES = {
    "white": ((0, 0, 200), (180, 30, 255)),
    "black": ((0, 0, 0), (180, 50, 60)),
    "red": ((0, 100, 100), (10, 255, 255)),
    "blue": ((100, 100, 100), (130, 255, 255)),
    "green": ((40, 40, 100), (80, 255, 255)),
    "yellow": ((20, 100, 100), (35, 255, 255)),
    "silver": ((0, 0, 140), (180, 20, 200)),
}


class ANPREngine:
    """
    Vehicle detection (YOLOv8n) + License plate OCR (PaddleOCR) engine.

    Designed for CPU-only inference with sub-100ms per-frame latency.
    Thread-safe: models are loaded once and reused across frames.
    """

    def __init__(self):
        self.settings = get_settings()
        self._yolo_model = None
        self._ocr_model = None
        self._initialized = False

    def initialize(self) -> None:
        """
        Load ML models. Called once at startup.

        YOLOv8n: Ultralytics pretrained on COCO (vehicle classes only)
        PaddleOCR: English recognition model (no angle classification)
        """
        if self._initialized:
            return

        logger.info("anpr_engine_initializing")
        start = time.monotonic()

        # Load YOLOv8n
        try:
            from ultralytics import YOLO
            self._yolo_model = YOLO(self.settings.yolo_model_name)
            logger.info("yolo_model_loaded", model=self.settings.yolo_model_name)
        except Exception as e:
            logger.error("yolo_load_failed", error=str(e))
            # Fallback: create a mock detector for demo
            self._yolo_model = None

        # Load PaddleOCR
        try:
            from paddleocr import PaddleOCR
            self._ocr_model = PaddleOCR(
                use_angle_cls=False,   # No angle classification needed
                lang="en",             # English for plate numbers
                use_gpu=self.settings.anpr_use_gpu,
                show_log=False,
                det_db_score_mode="slow",
                rec_batch_num=1,
            )
            logger.info("paddleocr_loaded")
        except Exception as e:
            logger.error("paddleocr_load_failed", error=str(e))
            self._ocr_model = None

        elapsed = time.monotonic() - start
        self._initialized = True
        logger.info("anpr_engine_ready", elapsed_sec=round(elapsed, 2))

    def process_frame(
        self,
        frame: np.ndarray,
        pts_ms: int,
        stream_metadata: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Process a single video frame through the detection + OCR pipeline.

        Returns a list of detection dicts, one per recognised plate.

        Args:
            frame: BGR numpy array (H, W, 3) from OpenCV/PyAV
            pts_ms: Presentation timestamp in milliseconds (from RTSP stream PTS)
            stream_metadata: Camera/stream context (camera_id, district, etc.)

        Returns:
            List of detection dicts with keys:
                plate_number, confidence, bbox, vehicle_type,
                vehicle_color, vehicle_confidence, snapshot, plate_crop
        """
        if not self._initialized:
            self.initialize()

        start = time.monotonic()
        detections = []

        # Step 1: Vehicle detection (YOLOv8n)
        vehicles = self._detect_vehicles(frame)

        for vehicle in vehicles:
            vx, vy, vw, vh = vehicle["bbox"]
            vehicle_crop = frame[vy:vy+vh, vx:vx+vw]

            if vehicle_crop.size == 0:
                continue

            # Step 2: Plate OCR on vehicle crop
            plates = self._read_plates(vehicle_crop)

            for plate_text, plate_conf, plate_bbox_rel in plates:
                # Validate against Indian plate format
                normalised = self._normalise_plate(plate_text)
                if not self._is_valid_plate(normalised):
                    continue

                # Absolute plate bbox within the full frame
                abs_bbox = {
                    "x": vx + plate_bbox_rel[0],
                    "y": vy + plate_bbox_rel[1],
                    "width": plate_bbox_rel[2],
                    "height": plate_bbox_rel[3],
                }

                # Step 3: Vehicle colour detection
                color = self._detect_color(vehicle_crop)

                # Step 4: Create snapshot crops
                snapshot_bytes = self._create_snapshot(frame, abs_bbox)
                plate_crop_bytes = self._create_plate_crop(frame, abs_bbox)

                detection = {
                    "plate_number": normalised,
                    "plate_number_display": plate_text.strip().upper(),
                    "confidence": round(plate_conf, 4),
                    "timestamp": datetime.now(tz=timezone.utc),
                    "pts_ms": pts_ms,
                    "bounding_box": abs_bbox,
                    "vehicle_type": vehicle["type"],
                    "vehicle_color": color,
                    "vehicle_confidence": round(vehicle["confidence"], 4),
                    "snapshot_bytes": snapshot_bytes,
                    "plate_crop_bytes": plate_crop_bytes,
                    "stream_metadata": stream_metadata,
                }
                detections.append(detection)

        processing_ms = int((time.monotonic() - start) * 1000)
        if detections:
            logger.info(
                "anpr_frame_processed",
                detections=len(detections),
                vehicles=len(vehicles),
                processing_ms=processing_ms,
                stream_id=stream_metadata.get("camera_id"),
            )

        for d in detections:
            d["processing_time_ms"] = processing_ms

        return detections

    def _detect_vehicles(self, frame: np.ndarray) -> list[dict[str, Any]]:
        """Run YOLOv8n vehicle detection on frame."""
        if self._yolo_model is None:
            # Fallback: mock detector for demo (returns random vehicles)
            return self._mock_detect_vehicles(frame)

        results = self._yolo_model(
            frame,
            conf=self.settings.yolo_confidence_threshold,
            classes=self.settings.yolo_vehicle_classes,
            verbose=False,
        )

        vehicles = []
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                if cls_id not in VEHICLE_CLASSES:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                vehicles.append({
                    "bbox": (x1, y1, x2 - x1, y2 - y1),
                    "type": VEHICLE_CLASSES[cls_id],
                    "confidence": float(box.conf[0]),
                })

        return vehicles

    def _mock_detect_vehicles(self, frame: np.ndarray) -> list[dict[str, Any]]:
        """Mock vehicle detector for when YOLO is unavailable."""
        h, w = frame.shape[:2]
        # Return the bottom-center area as a "vehicle"
        return [{
            "bbox": (w // 4, h // 2, w // 2, h // 3),
            "type": "car",
            "confidence": 0.85,
        }]

    def _read_plates(
        self, vehicle_crop: np.ndarray
    ) -> list[tuple[str, float, tuple[int, int, int, int]]]:
        """
        Run PaddleOCR on a vehicle crop to read license plates.

        Returns list of (text, confidence, relative_bbox) tuples.
        """
        h, w = vehicle_crop.shape[:2]

        # Skip if crop is too small for reliable OCR
        if w < self.settings.anpr_min_plate_width_px or h < 30:
            return []

        if self._ocr_model is None:
            # When OCR model is unavailable, return empty list (No fake inference)
            return []

        try:
            # Convert BGR to RGB for PaddleOCR
            rgb_crop = cv2.cvtColor(vehicle_crop, cv2.COLOR_BGR2RGB)
            results = self._ocr_model.ocr(rgb_crop, cls=False)

            plates = []
            if results and results[0]:
                for line in results[0]:
                    text = line[1][0]
                    confidence = float(line[1][1])

                    # Only accept high-confidence reads
                    if confidence < self.settings.anpr_confidence_threshold:
                        continue

                    # Extract bbox from OCR result
                    points = line[0]
                    x_min = int(min(p[0] for p in points))
                    y_min = int(min(p[1] for p in points))
                    x_max = int(max(p[0] for p in points))
                    y_max = int(max(p[1] for p in points))

                    plates.append((
                        text,
                        confidence,
                        (x_min, y_min, x_max - x_min, y_max - y_min),
                    ))

            return plates
        except Exception as e:
            logger.warning("ocr_failed", error=str(e)[:100])
            return []

    def _normalise_plate(self, text: str) -> str:
        """Normalise plate text: remove spaces, uppercase."""
        return re.sub(r"[^A-Z0-9]", "", text.strip().upper())

    def _is_valid_plate(self, normalised: str) -> bool:
        """Validate against Indian plate format."""
        if len(normalised) < 6 or len(normalised) > 12:
            return False
        # Check if it starts with a state code (2 letters)
        if not re.match(r"^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$", normalised):
            return False
        return True

    def _detect_color(self, vehicle_crop: np.ndarray) -> str:
        """Detect dominant vehicle colour using HSV ranges."""
        try:
            hsv = cv2.cvtColor(vehicle_crop, cv2.COLOR_BGR2HSV)
            # Sample the center region (avoid edges/wheels)
            h, w = hsv.shape[:2]
            center = hsv[h//4:h*3//4, w//4:w*3//4]

            best_color = "unknown"
            best_ratio = 0.0

            for color_name, (lower, upper) in COLOR_RANGES.items():
                mask = cv2.inRange(center, np.array(lower), np.array(upper))
                ratio = np.count_nonzero(mask) / mask.size
                if ratio > best_ratio and ratio > 0.15:
                    best_ratio = ratio
                    best_color = color_name

            return best_color
        except Exception:
            return "unknown"

    def _create_snapshot(
        self, frame: np.ndarray, bbox: dict[str, int]
    ) -> bytes:
        """Create a JPEG snapshot of the frame with detection overlay."""
        try:
            snapshot = frame.copy()
            # Draw detection box
            x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
            cv2.rectangle(snapshot, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # Encode as JPEG
            _, buffer = cv2.imencode(".jpg", snapshot, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return buffer.tobytes()
        except Exception:
            return b""

    def _create_plate_crop(
        self, frame: np.ndarray, bbox: dict[str, int]
    ) -> bytes:
        """Crop and encode just the plate region."""
        try:
            x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
            # Add padding
            pad = 10
            y1 = max(0, y - pad)
            y2 = min(frame.shape[0], y + h + pad)
            x1 = max(0, x - pad)
            x2 = min(frame.shape[1], x + w + pad)
            crop = frame[y1:y2, x1:x2]

            if crop.size == 0:
                return b""

            _, buffer = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
            return buffer.tobytes()
        except Exception:
            return b""
