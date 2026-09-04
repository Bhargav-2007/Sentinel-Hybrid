"""Video Stream Ingestion and Frame Capture for live.corp8.cloud feeds."""

import logging
import time
import urllib.request
from typing import Optional
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

logger = logging.getLogger("sentinel.ai.video")


import socket
from urllib.parse import urlparse

def _is_stream_reachable(stream_url: str, timeout: float = 0.5) -> bool:
    """Fast non-blocking TCP socket check to verify camera endpoint is reachable before opening capture."""
    try:
        parsed = urlparse(stream_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or (8554 if parsed.scheme == "rtsp" else 80)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def capture_frame_from_stream(stream_url: str, timeout_seconds: int = 2) -> Optional[np.ndarray]:
    """
    Connects to an RTSP / HLS / HTTP camera feed and grabs a single frame.
    Forces TCP transport for RTSP to prevent packet drop.
    Returns None if stream is unreachable or fails to decode. Zero synthetic fallback frames.
    """
    if cv2 is None:
        logger.warning("OpenCV is not available in current environment.")
        return None

    # Fast TCP connectivity pre-check to prevent blocking on offline endpoints
    if not _is_stream_reachable(stream_url, timeout=1.0):
        logger.warning(f"Camera endpoint {stream_url} is not reachable over TCP.")
        return None

    import os
    import urllib.parse

    user = os.getenv("SENTINEL_STREAM_USER")
    password = os.getenv("SENTINEL_STREAM_PASSWORD")
    if user and password and "@" not in stream_url.split("://")[-1]:
        scheme, rest = stream_url.split("://", 1)
        enc_u = urllib.parse.quote(user, safe="")
        enc_p = urllib.parse.quote(password, safe="")
        stream_url = f"{scheme}://{enc_u}:{enc_p}@{rest}"

    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|stimeout;2000000|timeout;2000000"

    frame = None
    cap = None
    try:
        cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        start_time = time.time()
        while time.time() - start_time < timeout_seconds:
            if not cap.isOpened():
                break
            ret, current_frame = cap.read()
            if ret and current_frame is not None:
                frame = current_frame
                break
            time.sleep(0.05)
    except Exception as e:
        logger.warning(f"Live stream capture notice for {stream_url}: {e}")
    finally:
        if cap is not None:
            cap.release()

    return frame

    return frame


def fetch_image_from_url(image_url: str, timeout_seconds: int = 4) -> Optional[np.ndarray]:
    """Fetches an image from an HTTP/HTTPS URL and decodes into an OpenCV BGR numpy array."""
    if cv2 is None:
        return None

    try:
        req = urllib.request.Request(
            image_url,
            headers={"User-Agent": "Gujarat-Sentinel-AI/2.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
            img_bytes = response.read()
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return frame
    except Exception as e:
        logger.error(f"Failed to fetch image from URL {image_url}: {e}")
        return None
