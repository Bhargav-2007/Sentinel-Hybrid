"""Authoritative Ingest Client & Decryption Gateway for https://cctv.corp8.cloud/.

Authenticates with cctv.corp8.cloud session auth, fetches AES-128 encryption key,
downloads and decrypts live HLS MPEG-TS segments for cameras cam01..cam30,
and exposes live frames and unencrypted TS segments for AI processing and browser playback.
"""

from __future__ import annotations

import base64
import logging
import os
import tempfile
import threading
import time
from typing import Dict, List, Optional, Tuple

import cv2
import httpx
import numpy as np
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from app.core.config import settings

logger = logging.getLogger("sentinel.services.corp8")

CORP8_BASE_URL = "https://cctv.corp8.cloud"


class Corp8Client:
    """Manages session authentication, AES key retrieval, segment decryption, and live frame extraction."""

    def __init__(self):
        self.email = settings.SENTINEL_STREAM_USER or "bhargav.umetiya@gmail.com"
        self.password = settings.SENTINEL_STREAM_PASSWORD or "PJMN-KC93-T648"
        self._session: Optional[httpx.Client] = None
        self._aes_key: Optional[bytes] = None
        self._lock = threading.Lock()
        self._last_auth_time = 0.0

        # In-memory decoded frame cache: cam_tag -> (frame_np, jpeg_bytes, timestamp, pts_ms)
        self._frame_cache: Dict[str, Tuple[np.ndarray, bytes, float, float]] = {}
        # In-memory decrypted segment cache: (cam_tag, seg_name) -> decrypted_bytes
        self._segment_cache: Dict[str, bytes] = {}
        # Background worker state
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None

    def _ensure_authenticated(self) -> bool:
        """Logs into cctv.corp8.cloud and caches session cookie and AES key."""
        with self._lock:
            now = time.time()
            # Re-auth if session is older than 2 hours or not set
            if self._session and self._aes_key and (now - self._last_auth_time < 7200):
                return True

            try:
                client = httpx.Client(
                    base_url=CORP8_BASE_URL,
                    follow_redirects=True,
                    timeout=15.0,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                        "Referer": f"{CORP8_BASE_URL}/",
                    },
                )
                # POST credentials to /auth/login
                login_resp = client.post(
                    "/auth/login",
                    data={"email": self.email, "password": self.password},
                )
                if login_resp.status_code not in (200, 302):
                    logger.error(f"Corp8 auth failed: HTTP {login_resp.status_code}")
                    return False

                # Fetch AES encryption key
                key_resp = client.get("/enc.key")
                if key_resp.status_code == 200 and len(key_resp.content) == 16:
                    self._aes_key = key_resp.content
                    self._session = client
                    self._last_auth_time = now
                    logger.info("✓ Successfully authenticated with cctv.corp8.cloud; AES-128 key loaded.")
                    return True
                else:
                    logger.error(f"Failed to fetch /enc.key from Corp8: HTTP {key_resp.status_code}")
                    return False
            except Exception as e:
                logger.error(f"Corp8 authentication exception: {e}")
                return False

    def get_live_segment_index(self, duration_sec: float = 43200.0, seg_duration: float = 6.0) -> int:
        """Calculates current live segment matching cctv.corp8.cloud wall-clock sync."""
        now = time.time()
        live_sec = now % duration_sec
        return int(live_sec / seg_duration)

    def decrypt_ts(self, encrypted_bytes: bytes) -> bytes:
        """Decrypts AES-128-CBC encrypted TS segment."""
        if not self._aes_key:
            return encrypted_bytes
        # AES-128-CBC with null IV (per #EXT-X-KEY standard in cctv.corp8.cloud)
        iv = b"\x00" * 16
        cipher = Cipher(algorithms.AES(self._aes_key), modes.CBC(iv))
        decryptor = cipher.decryptor()
        return decryptor.update(encrypted_bytes) + decryptor.finalize()

    def fetch_and_decrypt_segment(self, cam_tag: str, seg_name: Optional[str] = None) -> Optional[bytes]:
        """Fetches and decrypts a specific or current live TS segment for a camera."""
        if not self._ensure_authenticated():
            return None

        if not seg_name:
            seg_idx = self.get_live_segment_index()
            seg_name = f"seg{seg_idx:05d}.ts"

        cache_key = f"{cam_tag}_{seg_name}"
        if cache_key in self._segment_cache:
            return self._segment_cache[cache_key]

        try:
            url = f"/{cam_tag}/{seg_name}"
            session = self._session
            if not session:
                return None
            resp = session.get(url, timeout=5.0)
            if resp.status_code == 200:
                decrypted = self.decrypt_ts(resp.content)
                # Keep cache bounded
                with self._lock:
                    if len(self._segment_cache) > 30:
                        self._segment_cache.clear()
                    self._segment_cache[cache_key] = decrypted
                return decrypted
            elif resp.status_code in (401, 403):
                # Force re-authentication on next request
                self._last_auth_time = 0
                return None
        except Exception as e:
            logger.debug(f"Failed to fetch segment {seg_name} for {cam_tag}: {e}")

        return None

    def extract_frame_from_ts(self, ts_bytes: bytes, pts_offset_sec: float = 0.0) -> Optional[np.ndarray]:
        """Decodes the first usable video frame from MPEG-TS bytes."""
        tmp = None
        try:
            tmp = tempfile.NamedTemporaryFile(suffix=".ts", delete=False)
            tmp.write(ts_bytes)
            tmp.close()

            cap = cv2.VideoCapture(tmp.name)
            if pts_offset_sec > 0:
                cap.set(cv2.CAP_PROP_POS_MSEC, pts_offset_sec * 1000)

            ret, frame = cap.read()
            cap.release()
            if ret and frame is not None and frame.size > 0:
                return frame
        except Exception as e:
            logger.debug(f"Error extracting frame from TS: {e}")
        finally:
            if tmp and os.path.exists(tmp.name):
                try:
                    os.unlink(tmp.name)
                except Exception:
                    pass
        return None

    def get_latest_frame(self, cam_tag: str) -> Optional[np.ndarray]:
        """Returns the latest decoded numpy frame for a camera."""
        cached = self._frame_cache.get(cam_tag)
        now = time.time()
        # If cached frame is fresh (< 2.5s old), return it
        if cached and (now - cached[2] < 2.5):
            return cached[0]

        # Otherwise fetch and decode current segment
        ts_bytes = self.fetch_and_decrypt_segment(cam_tag)
        if ts_bytes:
            frame = self.extract_frame_from_ts(ts_bytes)
            if frame is not None:
                success, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                jpeg_bytes = buf.tobytes() if success else b""
                pts_ms = (now % 43200) * 1000
                self._frame_cache[cam_tag] = (frame, jpeg_bytes, now, pts_ms)
                return frame

        return cached[0] if cached else None

    def get_latest_jpeg(self, cam_tag: str) -> Optional[bytes]:
        """Returns the latest high-quality JPEG byte buffer for snapshot streaming."""
        cached = self._frame_cache.get(cam_tag)
        now = time.time()
        if cached and (now - cached[2] < 2.0):
            return cached[1]

        # Trigger fetch and decode
        frame = self.get_latest_frame(cam_tag)
        if frame is not None:
            cached = self._frame_cache.get(cam_tag)
            if cached:
                return cached[1]

        return cached[1] if cached else None

    def start_background_ingest(self, camera_ids: List[str]):
        """Starts background worker to continuously refresh live frames for all cameras."""
        if self._worker_thread and self._worker_thread.is_alive():
            return

        self._stop_event.clear()

        def _worker():
            logger.info(f"Corp8 background ingest loop active across {len(camera_ids)} cameras.")
            while not self._stop_event.is_set():
                for cid in camera_ids:
                    if self._stop_event.is_set():
                        break
                    try:
                        self.get_latest_frame(cid)
                    except Exception:
                        pass
                    time.sleep(0.15)  # Pace queries smoothly across feeds
                time.sleep(0.5)

        t = threading.Thread(target=_worker, name="Corp8IngestWorker", daemon=True)
        t.start()
        self._worker_thread = t

    def stop_background_ingest(self):
        self._stop_event.set()
        if self._worker_thread:
            self._worker_thread.join(timeout=2.0)
            self._worker_thread = None


corp8_ingest_service = Corp8Client()
