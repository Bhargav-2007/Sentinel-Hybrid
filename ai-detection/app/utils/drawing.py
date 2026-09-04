"""HUD Visual Overlay and Drawing Utilities for Police Video Walls."""

import base64
from typing import List, Optional
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from app.schemas import DetectedObject, LicensePlateDetection


# Palette for HUD visualization (BGR format for OpenCV)
HUD_COLORS = {
    "person": (255, 220, 0),         # Cyan
    "car": (100, 230, 0),            # Emerald Green
    "truck": (0, 160, 255),          # Amber / Orange
    "bus": (0, 215, 255),            # Gold
    "motorcycle": (255, 50, 220),    # Magenta
    "scooter": (220, 80, 255),       # Violet / Purple
    "auto-rickshaw": (0, 240, 255),  # Yellow
    "bicycle": (200, 150, 255),      # Light Purple
    "plate": (0, 255, 255),          # Neon Yellow
    "default": (255, 255, 255),      # White
}


def draw_corner_rect(img, pt1, pt2, color, thickness=2, length=12):
    """Draws sleek corner brackets around a bounding box for tactical HUD styling."""
    x1, y1 = pt1
    x2, y2 = pt2
    # Full rectangle thin
    cv2.rectangle(img, (x1, y1), (x2, y2), color, 1)
    # Corner brackets thick
    cl = min(length, abs(x2 - x1) // 3, abs(y2 - y1) // 3)
    if cl > 2:
        # Top-left
        cv2.line(img, (x1, y1), (x1 + cl, y1), color, thickness)
        cv2.line(img, (x1, y1), (x1, y1 + cl), color, thickness)
        # Top-right
        cv2.line(img, (x2, y1), (x2 - cl, y1), color, thickness)
        cv2.line(img, (x2, y1), (x2, y1 + cl), color, thickness)
        # Bottom-left
        cv2.line(img, (x1, y2), (x1 + cl, y2), color, thickness)
        cv2.line(img, (x1, y2), (x1, y2 - cl), color, thickness)
        # Bottom-right
        cv2.line(img, (x2, y2), (x2 - cl, y2), color, thickness)
        cv2.line(img, (x2, y2), (x2, y2 - cl), color, thickness)


def draw_hud_annotations(
    frame: np.ndarray,
    objects: Optional[List[DetectedObject]] = None,
    plates: Optional[List[LicensePlateDetection]] = None,
    camera_id: Optional[str] = None
) -> np.ndarray:
    """
    Renders high-visibility police command-center HUD annotations on the frame:
    - Glowing tactical corner bounding boxes
    - Track ID and vehicle type labels (e.g. 'CAR #14 [GJ 01 AB 1234] 95%')
    - Person tracking tags (e.g. 'PERSON #3 88%')
    - ANPR License Plate callout badges
    - Gujarat Police surveillance watermark
    """
    if cv2 is None or frame is None:
        return frame

    annotated = frame.copy()
    h, w, _ = annotated.shape

    # 1. Draw People and Vehicles
    if objects:
        for obj in objects:
            x1, y1 = int(obj.bbox.x1), int(obj.bbox.y1)
            x2, y2 = int(obj.bbox.x2), int(obj.bbox.y2)
            c_name = (obj.vehicle_type or obj.class_name or "object").lower()
            color = HUD_COLORS.get(c_name, HUD_COLORS.get(obj.class_name.lower(), HUD_COLORS["default"]))

            # Draw tactical corner box
            draw_corner_rect(annotated, (x1, y1), (x2, y2), color, thickness=2, length=14)

            # Label text
            track_str = f" #{obj.track_id}" if obj.track_id is not None else ""
            plate_str = f" [{obj.plate_text}]" if getattr(obj, "plate_text", None) else ""
            type_label = (obj.vehicle_type or obj.class_name).upper()
            label = f"{type_label}{track_str}{plate_str} {int(obj.confidence * 100)}%"

            # Label background badge
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            badge_y1 = max(0, y1 - 20)
            badge_y2 = y1
            cv2.rectangle(annotated, (x1, badge_y1), (x1 + tw + 8, badge_y2), (10, 15, 25), -1)
            cv2.rectangle(annotated, (x1, badge_y1), (x1 + tw + 8, badge_y2), color, 1)
            cv2.putText(annotated, label, (x1 + 4, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

    # 2. Draw License Plates
    if plates:
        for pl in plates:
            plate_str = pl.formatted_plate or pl.plate_number
            if not plate_str or not plate_str.strip():
                continue

            x1, y1 = int(pl.bbox.x1), int(pl.bbox.y1)
            x2, y2 = int(pl.bbox.x2), int(pl.bbox.y2)
            plate_color = HUD_COLORS["plate"]

            # Double outline box for license plate
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 0), 3)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), plate_color, 2)

            # Plate callout badge
            conf_str = f" ({int(pl.confidence * 100)}%)" if pl.confidence > 0 else ""
            badge_text = f"PLATE: {plate_str}{conf_str}"
            (tw, th), _ = cv2.getTextSize(badge_text, cv2.FONT_HERSHEY_SIMPLEX, 0.52, 1)
            by1 = max(0, y1 - 24)
            by2 = y1
            cv2.rectangle(annotated, (x1, by1), (x1 + tw + 10, by2), (0, 0, 0), -1)
            cv2.rectangle(annotated, (x1, by1), (x1 + tw + 10, by2), plate_color, 1)
            cv2.putText(annotated, badge_text, (x1 + 5, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.52, plate_color, 1, cv2.LINE_AA)

    # 3. Top-left Gujarat Police HUD Status Stamp
    status_label = f"GUJARAT POLICE AI SENTINEL • {camera_id.upper() if camera_id else 'LIVE'}"
    (sw, sh), _ = cv2.getTextSize(status_label, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
    cv2.rectangle(annotated, (10, 8), (20 + sw, 32), (10, 15, 25), -1)
    cv2.rectangle(annotated, (10, 8), (20 + sw, 32), (0, 229, 255), 1)
    cv2.putText(annotated, status_label, (15, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 229, 255), 1, cv2.LINE_AA)

    return annotated


def frame_to_base64(frame: np.ndarray, quality: int = 80) -> str:
    """Encodes an OpenCV BGR numpy frame into a Base64 JPEG string."""
    if cv2 is None or frame is None:
        return ""
    try:
        _, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        return base64.b64encode(buffer).decode("utf-8")
    except Exception:
        return ""


def base64_to_frame(b64_str: str) -> Optional[np.ndarray]:
    """Decodes a Base64 JPEG/PNG string into an OpenCV BGR numpy frame."""
    if cv2 is None or not b64_str:
        return None
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return frame
    except Exception:
        return None
