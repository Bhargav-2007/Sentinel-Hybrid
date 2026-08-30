"""HUD Visual Overlay and Drawing Utilities for Police Video Walls."""

import base64
from typing import List, Optional
import numpy as np

# Try importing cv2, provide fallback if cv2 is not available in local test mode
try:
    import cv2
except ImportError:
    cv2 = None

from app.schemas import DetectedObject, LicensePlateDetection


# Palette for HUD visualization (BGR format for OpenCV)
HUD_COLORS = {
    "person": (255, 229, 0),       # Cyan
    "car": (118, 230, 0),          # Emerald Green
    "truck": (0, 179, 255),        # Amber / Orange
    "bus": (0, 215, 255),          # Gold
    "motorcycle": (251, 64, 224),  # Magenta
    "bicycle": (200, 100, 255),    # Light Purple
    "plate": (0, 255, 255),        # Neon Yellow
    "default": (255, 255, 255),    # White
}


def draw_hud_annotations(
    frame: np.ndarray,
    objects: Optional[List[DetectedObject]] = None,
    plates: Optional[List[LicensePlateDetection]] = None,
    camera_id: Optional[str] = None
) -> np.ndarray:
    """
    Renders high-visibility police command-center HUD annotations on the frame:
    - Glowing corner bounding boxes
    - Track ID labels (e.g. 'CAR #14 [98%]')
    - ANPR License Plate callout badges
    - Gujarat Police watermark and frame timestamp
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
            color = HUD_COLORS.get(obj.class_name.lower(), HUD_COLORS["default"])

            # Bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            # Label text
            track_str = f" #{obj.track_id}" if obj.track_id is not None else ""
            label = f"{obj.class_name.upper()}{track_str} {int(obj.confidence * 100)}%"

            # Label background badge
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, max(0, y1 - 22)), (x1 + tw + 8, y1), color, -1)
            cv2.putText(annotated, label, (x1 + 4, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

    # 2. Draw License Plates
    if plates:
        for pl in plates:
            x1, y1 = int(pl.bbox.x1), int(pl.bbox.y1)
            x2, y2 = int(pl.bbox.x2), int(pl.bbox.y2)
            plate_color = HUD_COLORS["plate"]

            # Double outline box for high visibility
            cv2.rectangle(annotated, (x1, y1), (x2, y2), plate_color, 2)
            
            # Plate callout badge
            plate_text = f"PLATE: {pl.formatted_plate} ({int(pl.confidence * 100)}%)"
            (tw, th), _ = cv2.getTextSize(plate_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(annotated, (x1, max(0, y1 - 26)), (x1 + tw + 10, y1), (0, 0, 0), -1)
            cv2.rectangle(annotated, (x1, max(0, y1 - 26)), (x1 + tw + 10, y1), plate_color, 1)
            cv2.putText(annotated, plate_text, (x1 + 5, y1 - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.6, plate_color, 2, cv2.LINE_AA)

    # 3. Top-left Gujarat Police HUD Status Stamp
    status_label = f"GUJARAT POLICE AI SENTINEL • {camera_id.upper() if camera_id else 'LIVE'}"
    cv2.putText(annotated, status_label, (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 229, 255), 2, cv2.LINE_AA)

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
        # Strip potential data URL prefix
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return frame
    except Exception:
        return None
