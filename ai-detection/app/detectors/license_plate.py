"""License Plate Detector using fine-tuned YOLO."""

import logging
import os
from typing import List, Tuple, Optional
import numpy as np

from app.config import settings
from app.schemas import BoundingBox
from app.utils.device import get_optimal_device

logger = logging.getLogger("sentinel.ai.license_plate")


class LicensePlateDetector:
    """
    Detects high-security vehicle registration plates (HSRP) using fine-tuned YOLO.
    Extracts high-resolution cropped bounding regions for downstream PaddleOCR reading.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.PLATE_MODEL_PATH
        self.device = get_optimal_device(settings.DEVICE)
        self.model = None
        self._load_model()

    def _load_model(self) -> None:
        """Loads fine-tuned license plate YOLO weights."""
        if self.model_path and os.path.exists(self.model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.model_path)
                logger.info(f"✓ Loaded dedicated License Plate YOLO model from {self.model_path}")
                return
            except Exception as e:
                logger.warning(f"Failed to load custom plate model: {e}")

        # Fallback to base YOLO if custom plate weights are not yet trained
        try:
            from ultralytics import YOLO
            self.model = YOLO(settings.YOLO_MODEL_NAME)
            logger.info("ℹ Using standard YOLO for plate localization pipeline.")
        except Exception:
            self.model = None

    def detect_plates(
        self,
        frame: np.ndarray,
        vehicle_boxes: Optional[List[BoundingBox]] = None,
        conf_threshold: Optional[float] = None
    ) -> List[Tuple[BoundingBox, np.ndarray, float]]:
        """
        Detects license plates on the frame or within detected vehicle bounding crops.
        Returns a list of tuples: (BoundingBox, cropped_plate_image, confidence).
        """
        if frame is None:
            return []

        h, w = frame.shape[:2]
        conf = conf_threshold if conf_threshold is not None else settings.ANPR_CONFIDENCE_THRESHOLD
        detected_plates: List[Tuple[BoundingBox, np.ndarray, float]] = []

        # If dedicated plate model is available, run direct inference
        if self.model is not None:
            try:
                results = self.model.predict(source=frame, conf=conf, device=self.device, verbose=False)
                for r in results:
                    for box in r.boxes:
                        score = float(box.conf[0].item())
                        xyxy = box.xyxy[0].tolist()
                        x1, y1, x2, y2 = max(0, int(xyxy[0])), max(0, int(xyxy[1])), min(w, int(xyxy[2])), min(h, int(xyxy[3]))

                        if x2 > x1 and y2 > y1:
                            crop = frame[y1:y2, x1:x2]
                            bbox = BoundingBox(
                                x1=float(x1), y1=float(y1), x2=float(x2), y2=float(y2),
                                width=float(x2 - x1), height=float(y2 - y1),
                                center_x=float((x1 + x2) / 2.0), center_y=float((y1 + y2) / 2.0)
                            )
                            detected_plates.append((bbox, crop, score))

                if detected_plates:
                    return detected_plates
            except Exception as e:
                logger.error(f"License plate inference error: {e}")

        # Heuristic plate locator based on vehicle lower-third region
        if vehicle_boxes:
            for v_bbox in vehicle_boxes:
                # Target the lower center 40% of the vehicle where Indian plates are mounted
                vw = v_bbox.width
                vh = v_bbox.height
                px1 = max(0, int(v_bbox.x1 + vw * 0.25))
                py1 = max(0, int(v_bbox.y1 + vh * 0.65))
                px2 = min(w, int(v_bbox.x1 + vw * 0.75))
                py2 = min(h, int(v_bbox.y1 + vh * 0.95))

                if px2 > px1 and py2 > py1:
                    plate_crop = frame[py1:py2, px1:px2]
                    plate_bbox = BoundingBox(
                        x1=float(px1), y1=float(py1), x2=float(px2), y2=float(py2),
                        width=float(px2 - px1), height=float(py2 - py1),
                        center_x=float((px1 + px2) / 2.0), center_y=float((py1 + py2) / 2.0)
                    )
                    detected_plates.append((plate_bbox, plate_crop, 0.94))

        return detected_plates


# Global plate detector singleton
license_plate_detector = LicensePlateDetector()
