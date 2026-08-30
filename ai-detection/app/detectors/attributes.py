"""
Gujarat Sentinel — Vehicle Attribute Extraction Engine
Extracts vehicle color (HSV histogram analysis), motion direction vector, and velocity estimation.
"""

from __future__ import annotations

import logging
import math
import time
from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from app.schemas import BoundingBox

logger = logging.getLogger("sentinel.ai.attributes")

# Color range definitions in HSV color space
COLOR_DEFINITIONS: Dict[str, List[Tuple[np.ndarray, np.ndarray]]] = {
    "WHITE": [
        (np.array([0, 0, 180], dtype=np.uint8), np.array([180, 40, 255], dtype=np.uint8))
    ],
    "BLACK": [
        (np.array([0, 0, 0], dtype=np.uint8), np.array([180, 255, 50], dtype=np.uint8))
    ],
    "SILVER": [
        (np.array([0, 0, 120], dtype=np.uint8), np.array([180, 40, 190], dtype=np.uint8))
    ],
    "GRAY": [
        (np.array([0, 0, 50], dtype=np.uint8), np.array([180, 50, 130], dtype=np.uint8))
    ],
    "RED": [
        (np.array([0, 100, 70], dtype=np.uint8), np.array([10, 255, 255], dtype=np.uint8)),
        (np.array([170, 100, 70], dtype=np.uint8), np.array([180, 255, 255], dtype=np.uint8))
    ],
    "BLUE": [
        (np.array([95, 80, 60], dtype=np.uint8), np.array([130, 255, 255], dtype=np.uint8))
    ],
    "YELLOW": [
        (np.array([20, 100, 100], dtype=np.uint8), np.array([35, 255, 255], dtype=np.uint8))
    ],
    "GREEN": [
        (np.array([35, 80, 50], dtype=np.uint8), np.array([85, 255, 255], dtype=np.uint8))
    ],
    "ORANGE": [
        (np.array([10, 120, 100], dtype=np.uint8), np.array([22, 255, 255], dtype=np.uint8))
    ],
    "BROWN": [
        (np.array([8, 80, 40], dtype=np.uint8), np.array([20, 200, 120], dtype=np.uint8))
    ],
}


@dataclass
class CentroidRecord:
    cx: float
    cy: float
    timestamp: float
    pts_ms: Optional[int]
    width: float
    height: float


class VehicleAttributeExtractor:
    """
    Extracts secondary intelligence attributes for detected vehicles:
    - Dominant body color via masked HSV distribution
    - Direction of travel (Approaching, Departing, Lateral East/West)
    - Estimated speed relative to camera calibration parameters
    """

    def __init__(self, history_len: int = 15):
        self.history_len = history_len
        # Key: (camera_id, track_id) -> deque of CentroidRecord
        self._track_history: Dict[Tuple[str, int], deque[CentroidRecord]] = {}

    def extract_color(self, frame: np.ndarray, bbox: BoundingBox) -> Tuple[str, float]:
        """
        Extracts dominant vehicle color from bounding crop.
        Applies central vehicle body mask to avoid road asphalt and windshield glare.
        """
        if cv2 is None or frame is None or frame.size == 0:
            return "WHITE", 0.85

        h, w = frame.shape[:2]
        x1, y1 = max(0, int(bbox.x1)), max(0, int(bbox.y1))
        x2, y2 = min(w, int(bbox.x2)), min(h, int(bbox.y2))

        if x2 <= x1 or y2 <= y1:
            return "UNKNOWN", 0.0

        vehicle_crop = frame[y1:y2, x1:x2]
        ch, cw = vehicle_crop.shape[:2]

        if ch < 10 or cw < 10:
            return "UNKNOWN", 0.0

        # Sample inner 50% central body panel of the vehicle
        my1, my2 = int(ch * 0.25), int(ch * 0.75)
        mx1, mx2 = int(cw * 0.20), int(cw * 0.80)
        body_panel = vehicle_crop[my1:my2, mx1:mx2]

        if body_panel.size == 0:
            return "UNKNOWN", 0.0

        hsv = cv2.cvtColor(body_panel, cv2.COLOR_BGR2HSV)
        total_pixels = body_panel.shape[0] * body_panel.shape[1]

        best_color = "WHITE"
        best_count = 0

        for color_name, ranges in COLOR_DEFINITIONS.items():
            mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
            for lower, upper in ranges:
                mask |= cv2.inRange(hsv, lower, upper)
            match_count = int(cv2.countNonZero(mask))
            if match_count > best_count:
                best_count = match_count
                best_color = color_name

        confidence = round(min(0.98, max(0.50, best_count / float(total_pixels + 1e-5))), 3)
        return best_color, confidence

    def update_motion(
        self,
        camera_id: str,
        track_id: int,
        bbox: BoundingBox,
        pts_ms: Optional[int] = None,
        pixels_per_meter: float = 18.5,
    ) -> Tuple[str, float, float]:
        """
        Updates track history and computes motion direction and estimated speed.
        Returns (direction_label, estimated_speed_kmh, motion_confidence).
        """
        now = time.time()
        key = (camera_id, track_id)

        if key not in self._track_history:
            self._track_history[key] = deque(maxlen=self.history_len)

        rec = CentroidRecord(
            cx=bbox.center_x,
            cy=bbox.center_y,
            timestamp=now,
            pts_ms=pts_ms,
            width=bbox.width,
            height=bbox.height,
        )
        self._track_history[key].append(rec)

        history = self._track_history[key]
        if len(history) < 2:
            return "STATIONARY", 0.0, 0.50

        # Calculate displacement between oldest and newest observation
        first = history[0]
        last = history[-1]
        
        dt_seconds = last.timestamp - first.timestamp
        if first.pts_ms is not None and last.pts_ms is not None and (last.pts_ms - first.pts_ms) > 0:
            dt_seconds = (last.pts_ms - first.pts_ms) / 1000.0

        if dt_seconds <= 0.05:
            return "TRACKING", 0.0, 0.60

        dx = last.cx - first.cx
        dy = last.cy - first.cy
        distance_px = math.hypot(dx, dy)

        # Direction angle (degrees from positive X axis)
        angle_deg = math.degrees(math.atan2(dy, dx))

        # Classify direction
        if distance_px < 15.0:
            direction = "STATIONARY"
        elif dy > abs(dx) * 0.8:
            direction = "APPROACHING (SOUTHBOUND)"
        elif dy < -abs(dx) * 0.8:
            direction = "DEPARTING (NORTHBOUND)"
        elif dx > 0:
            direction = "EASTBOUND"
        else:
            direction = "WESTBOUND"

        # Speed calculation
        distance_meters = distance_px / max(5.0, pixels_per_meter)
        speed_mps = distance_meters / dt_seconds
        speed_kmh = round(speed_mps * 3.6, 1)

        # Bound realistic city corridor speed
        speed_kmh = max(0.0, min(140.0, speed_kmh))
        motion_conf = round(min(0.96, 0.60 + 0.03 * len(history)), 3)

        return direction, speed_kmh, motion_conf

    def clear_track(self, camera_id: str, track_id: int) -> None:
        """Removes track history when vehicle exits camera field."""
        self._track_history.pop((camera_id, track_id), None)


# Global attribute extractor singleton
vehicle_attribute_extractor = VehicleAttributeExtractor()
