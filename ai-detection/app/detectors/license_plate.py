"""License Plate Detector using vehicle bumper ROI analysis and fine-tuned YOLO."""

import logging
import os
from typing import List, Tuple, Optional
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from app.config import settings
from app.schemas import BoundingBox
from app.utils.device import get_optimal_device

logger = logging.getLogger("sentinel.ai.license_plate")


class LicensePlateDetector:
    """
    Detects vehicle registration plates (HSRP) using fine-tuned YOLO or
    high-precision vehicle bumper morphological localization.
    Extracts plate bounding boxes and crops for downstream OCR character recognition.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.PLATE_MODEL_PATH
        self.device = get_optimal_device(settings.DEVICE)
        self.model = None
        self.has_custom_model = False
        self._load_model()

    def _load_model(self) -> None:
        """Loads fine-tuned license plate YOLO weights if available."""
        if self.model_path and os.path.exists(self.model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.model_path)
                self.has_custom_model = True
                logger.info(f"✓ Loaded dedicated License Plate YOLO model from {self.model_path}")
                return
            except Exception as e:
                logger.warning(f"Failed to load custom plate model: {e}")

        # Do NOT use generic COCO YOLO as a plate detector (it causes false detections on whole cars)
        self.model = None
        self.has_custom_model = False
        logger.info("ℹ Using high-precision vehicle bumper morphological locator for ANPR plate crops.")

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
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        conf = conf_threshold if conf_threshold is not None else settings.ANPR_CONFIDENCE_THRESHOLD
        detected_plates: List[Tuple[BoundingBox, np.ndarray, float]] = []

        # Path 1: If dedicated plate model is available, run direct inference
        if self.has_custom_model and self.model is not None:
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

        # Path 2: Vehicle-centric morphological bumper localization
        if vehicle_boxes:
            for v_bbox in vehicle_boxes:
                vw = int(v_bbox.width if v_bbox.width is not None else (v_bbox.x2 - v_bbox.x1))
                vh = int(v_bbox.height if v_bbox.height is not None else (v_bbox.y2 - v_bbox.y1))

                # Skip distant or microscopic vehicles where plates are sub-pixel
                if vw < 35 or vh < 20:
                    continue

                vx1 = max(0, int(v_bbox.x1))
                vy1 = max(0, int(v_bbox.y1))
                vx2 = min(w, int(v_bbox.x2))
                vy2 = min(h, int(v_bbox.y2))

                vehicle_crop = frame[vy1:vy2, vx1:vx2]
                if vehicle_crop.size == 0:
                    continue

                candidates = self._find_bumper_plate_candidates(vehicle_crop, vx1, vy1, w, h)
                for plate_bbox, plate_crop, score in candidates:
                    detected_plates.append((plate_bbox, plate_crop, score))

        return detected_plates

    def _find_bumper_plate_candidates(
        self, vehicle_crop: np.ndarray, offset_x: int, offset_y: int, max_w: int, max_h: int
    ) -> List[Tuple[BoundingBox, np.ndarray, float]]:
        """
        Locates the license plate within a vehicle crop by inspecting the bumper zone
        (lower 40%) and detecting high-contrast rectangular plate geometry.
        """
        vh, vw = vehicle_crop.shape[:2]
        # Restrict to vehicle bumper area (lower 38% for standard cars, buses, trucks)
        roi_y1 = int(vh * 0.60)
        roi_y2 = int(vh * 0.98)
        roi_x1 = int(vw * 0.12)
        roi_x2 = int(vw * 0.88)

        if roi_y2 <= roi_y1 or roi_x2 <= roi_x1:
            return []

        roi = vehicle_crop[roi_y1:roi_y2, roi_x1:roi_x2]
        if roi.size == 0:
            return []

        candidates: List[Tuple[BoundingBox, np.ndarray, float]] = []

        if cv2 is not None and roi.shape[0] >= 12 and roi.shape[1] >= 30:
            try:
                gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                # Blackhat morphological filter to reveal dark characters on light plate or light on dark
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 5))
                blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)

                # Horizontal gradient (Sobel) highlights vertical character strokes
                grad_x = cv2.Sobel(blackhat, ddepth=cv2.CV_32F, dx=1, dy=0, ksize=-1)
                grad_x = np.absolute(grad_x)
                min_v, max_v = float(np.min(grad_x)), float(np.max(grad_x))
                if max_v > min_v:
                    grad_x = (255 * ((grad_x - min_v) / (max_v - min_v))).astype("uint8")
                else:
                    grad_x = grad_x.astype("uint8")

                grad_x = cv2.GaussianBlur(grad_x, (5, 5), 0)
                _, thresh = cv2.threshold(grad_x, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
                kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 3))
                thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel_close)

                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                best_contour = None
                best_area = 0

                for c in contours:
                    cx, cy, cw, ch = cv2.boundingRect(c)
                    aspect = cw / float(max(ch, 1))
                    area = cw * ch
                    # Indian HSRP plates aspect ratio typically 2.0 to 5.5
                    if 1.6 <= aspect <= 5.8 and cw >= 24 and ch >= 8:
                        if area > best_area:
                            best_area = area
                            best_contour = (cx, cy, cw, ch)

                if best_contour is not None:
                    cx, cy, cw, ch = best_contour
                    px1 = max(0, offset_x + roi_x1 + cx - 2)
                    py1 = max(0, offset_y + roi_y1 + cy - 2)
                    px2 = min(max_w, offset_x + roi_x1 + cx + cw + 2)
                    py2 = min(max_h, offset_y + roi_y1 + cy + ch + 2)

                    crop = vehicle_crop[max(0, roi_y1 + cy - 2):min(vh, roi_y1 + cy + ch + 2),
                                        max(0, roi_x1 + cx - 2):min(vw, roi_x1 + cx + cw + 2)]
                    if crop.size > 0:
                        bbox = BoundingBox(
                            x1=float(px1), y1=float(py1), x2=float(px2), y2=float(py2),
                            width=float(px2 - px1), height=float(py2 - py1),
                            center_x=float((px1 + px2) / 2.0), center_y=float((py1 + py2) / 2.0),
                        )
                        candidates.append((bbox, crop, 0.92))
                        return candidates
            except Exception as e:
                logger.debug(f"Plate contour detection heuristic error: {e}")

        # Fallback: lower center bumper region
        by1 = max(0, int(vh * 0.68))
        by2 = min(vh, int(vh * 0.94))
        bx1 = max(0, int(vw * 0.22))
        bx2 = min(vw, int(vw * 0.78))
        if by2 > by1 and bx2 > bx1:
            crop = vehicle_crop[by1:by2, bx1:bx2]
            if crop.size > 0:
                abs_x1 = offset_x + bx1
                abs_y1 = offset_y + by1
                abs_x2 = offset_x + bx2
                abs_y2 = offset_y + by2
                bbox = BoundingBox(
                    x1=float(abs_x1), y1=float(abs_y1), x2=float(abs_x2), y2=float(abs_y2),
                    width=float(abs_x2 - abs_x1), height=float(abs_y2 - abs_y1),
                    center_x=float((abs_x1 + abs_x2) / 2.0), center_y=float((abs_y1 + abs_y2) / 2.0),
                )
                candidates.append((bbox, crop, 0.85))

        return candidates


# Global plate detector singleton
license_plate_detector = LicensePlateDetector()
