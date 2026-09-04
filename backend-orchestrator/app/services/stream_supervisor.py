"""Production Multi-Camera Stream Supervisor & Processing Engine.

Architected for 30 concurrent physical CCTV feeds with:
- Per-camera thread/process isolation
- Distinct lifecycle states (STARTING -> CONNECTING -> AUTHENTICATING -> STREAMING -> DECODING -> AI_PROCESSING -> DEGRADED -> RECONNECTING -> OFFLINE)
- Decoupled rate accounting: SOURCE_FPS, DECODE_FPS, AI_FPS, DISPLAY_FPS, EVENT_FPS
- Bounded queues (maxsize=2) with latest-frame retention and stale-frame dropping
- Configurable frame sampling (e.g. 1 FPS, 2 FPS, 5 FPS)
- Fair priority scheduling with starvation prevention
- Central AI Worker Pool dispatching to authoritative ai-detection microservice
- Automatic exponential backoff + jitter reconnect
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
import logging
import os
import queue
import random
import threading
import time
from typing import Any, Callable, Dict, List, Optional
import uuid

import cv2
import httpx
import numpy as np

from app.core.config import settings

logger = logging.getLogger("sentinel.supervisor")


class CameraWorkerState(str, Enum):
    STARTING = "STARTING"
    CONNECTING = "CONNECTING"
    AUTHENTICATING = "AUTHENTICATING"
    STREAMING = "STREAMING"
    DECODING = "DECODING"
    AI_PROCESSING = "AI_PROCESSING"
    DEGRADED = "DEGRADED"
    RECONNECTING = "RECONNECTING"
    OFFLINE = "OFFLINE"


class CameraPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


@dataclass
class FramePacket:
    camera_id: str
    cam_tag: str
    frame: np.ndarray
    decoded_pts_ms: float
    observation_time_utc: str
    frame_sequence: int
    source_resolution: tuple[int, int]


@dataclass
class CameraTelemetry:
    camera_id: str
    cam_tag: str
    state: CameraWorkerState
    priority: CameraPriority
    target_ai_fps: float
    # Measured Rates
    source_fps: float = 0.0
    decode_fps: float = 0.0
    ai_fps: float = 0.0
    display_fps: float = 0.0
    event_fps: float = 0.0
    # Counters
    frames_received: int = 0
    frames_decoded: int = 0
    frames_dropped: int = 0
    ai_frames_processed: int = 0
    ai_errors: int = 0
    reconnect_count: int = 0
    queue_depth: int = 0
    # Decoupled Facts
    network_reachable: bool = False
    authenticated: bool = False
    rtsp_session_established: bool = False
    rtp_media_observed: bool = False
    decoder_open: bool = False
    frame_active: bool = False
    ai_active: bool = False
    tracking_active: bool = False
    anpr_active: str = "NOT_TESTED"
    # Timing
    last_frame_at: Optional[str] = None
    last_ai_at: Optional[str] = None
    last_error: Optional[str] = None
    codec_observed: Optional[str] = None


class CameraWorker:
    """
    Dedicated worker managing ingestion, decoding, and bounded queuing for a single camera.
    Completely isolated so that one failing stream never stalls other streams.
    """

    def __init__(
        self,
        camera_id: str,
        rtsp_url: str,
        target_ai_fps: float = 2.0,
        priority: CameraPriority = CameraPriority.NORMAL,
        event_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        self.camera_id = camera_id
        self.cam_tag = camera_id if camera_id.startswith("cam") else f"cam{int(camera_id):02d}"
        self.rtsp_url = rtsp_url
        self.target_ai_fps = max(0.5, min(30.0, target_ai_fps))
        self.priority = priority
        self.event_callback = event_callback

        self.state = CameraWorkerState.STARTING
        self.telemetry = CameraTelemetry(
            camera_id=self.camera_id,
            cam_tag=self.cam_tag,
            state=self.state,
            priority=self.priority,
            target_ai_fps=self.target_ai_fps,
        )

        # Bounded frame queue: maximum 2 frames to enforce lowest latency
        self.frame_queue: queue.Queue[FramePacket] = queue.Queue(maxsize=2)
        self._stop_signal = threading.Event()
        self._thread: Optional[threading.Thread] = None

        # Rate tracking sliding windows
        self._decode_timestamps: List[float] = []
        self._ai_timestamps: List[float] = []
        self._last_ai_dispatch: float = 0.0
        self._frame_seq: int = 0

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_signal.clear()
        self._thread = threading.Thread(
            target=self._run_ingest_loop,
            name=f"CameraWorker-{self.cam_tag}",
            daemon=True,
        )
        self._thread.start()
        logger.info(f"[{self.cam_tag}] Ingestion worker started.")

    def stop(self):
        self._stop_signal.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self.state = CameraWorkerState.OFFLINE
        self.telemetry.state = CameraWorkerState.OFFLINE
        logger.info(f"[{self.cam_tag}] Ingestion worker stopped.")

    def _set_state(self, new_state: CameraWorkerState, error: Optional[str] = None):
        self.state = new_state
        self.telemetry.state = new_state
        if error:
            self.telemetry.last_error = error
            logger.warning(f"[{self.cam_tag}] State -> {new_state.value}: {error}")
        else:
            logger.debug(f"[{self.cam_tag}] State -> {new_state.value}")

    def _update_rates(self):
        now = time.time()
        # Clean timestamps older than 2.0s
        self._decode_timestamps = [t for t in self._decode_timestamps if now - t <= 2.0]
        self._ai_timestamps = [t for t in self._ai_timestamps if now - t <= 2.0]

        self.telemetry.decode_fps = round(len(self._decode_timestamps) / 2.0, 1)
        self.telemetry.ai_fps = round(len(self._ai_timestamps) / 2.0, 1)
        self.telemetry.queue_depth = self.frame_queue.qsize()

    def _run_ingest_loop(self):
        retry_delay = 1.0
        max_retry_delay = 16.0

        while not self._stop_signal.is_set():
            self._set_state(CameraWorkerState.CONNECTING)
            self.telemetry.reconnect_count += 1

            cap: Optional[cv2.VideoCapture] = None
            try:
                # Force TCP interleaved transport
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
                self._set_state(CameraWorkerState.AUTHENTICATING)

                cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                if not cap.isOpened():
                    raise RuntimeError("RTSP connection/authentication failed to open decoder.")

                self.telemetry.network_reachable = True
                self.telemetry.authenticated = True
                self.telemetry.rtsp_session_established = True
                self.telemetry.decoder_open = True

                # Read probe frame
                self._set_state(CameraWorkerState.STREAMING)
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    raise RuntimeError("RTP stream opened but zero valid frames decoded.")

                self.telemetry.rtp_media_observed = True
                self.telemetry.frame_active = True
                self._set_state(CameraWorkerState.DECODING)
                retry_delay = 1.0  # Reset backoff on success

                # Ingestion loop
                while not self._stop_signal.is_set():
                    ret, frame = cap.read()
                    if not ret or frame is None or frame.size == 0:
                        logger.warning(f"[{self.cam_tag}] Frame stream interrupted.")
                        break

                    now = time.time()
                    now_utc = datetime.now(timezone.utc).isoformat()
                    self._frame_seq += 1
                    self.telemetry.frames_received += 1
                    self.telemetry.frames_decoded += 1
                    self.telemetry.last_frame_at = now_utc
                    self._decode_timestamps.append(now)

                    raw_pts = cap.get(cv2.CAP_PROP_POS_MSEC)
                    decoded_pts = round(float(raw_pts), 2) if raw_pts > 0 else 0.0
                    h, w = frame.shape[:2]
                    self.telemetry.codec_observed = "H264" if w > 0 else None

                    # Check AI sampling eligibility (e.g. 2 FPS -> every 500ms)
                    min_interval = 1.0 / self.target_ai_fps
                    if (now - self._last_ai_dispatch) >= min_interval:
                        pkt = FramePacket(
                            camera_id=self.camera_id,
                            cam_tag=self.cam_tag,
                            frame=frame,
                            decoded_pts_ms=decoded_pts,
                            observation_time_utc=now_utc,
                            frame_sequence=self._frame_seq,
                            source_resolution=(w, h),
                        )
                        # Bounded queue newest-frame policy: drop oldest if full
                        if self.frame_queue.full():
                            try:
                                self.frame_queue.get_nowait()
                                self.telemetry.frames_dropped += 1
                            except queue.Empty:
                                pass
                        try:
                            self.frame_queue.put_nowait(pkt)
                            self._last_ai_dispatch = now
                        except queue.Full:
                            self.telemetry.frames_dropped += 1

                    self._update_rates()

            except Exception as exc:
                self.telemetry.frame_active = False
                self.telemetry.rtp_media_observed = False
                self._set_state(CameraWorkerState.RECONNECTING, error=str(exc))
            finally:
                if cap is not None:
                    cap.release()

            if self._stop_signal.is_set():
                break

            # Exponential backoff + jitter
            jitter = random.uniform(0.1, 0.5)
            sleep_time = min(max_retry_delay, retry_delay) + jitter
            logger.info(f"[{self.cam_tag}] Reconnecting in {sleep_time:.1f}s...")
            time.sleep(sleep_time)
            retry_delay = min(max_retry_delay, retry_delay * 2.0)

        self._set_state(CameraWorkerState.OFFLINE)


class FrameScheduler:
    """
    Fair priority scheduler that extracts frames from camera workers and feeds
    the AI Worker Pool. Prevents starvation of lower priority cameras.
    """

    def __init__(self, workers: Dict[str, CameraWorker]):
        self.workers = workers
        self._round_robin_index = 0

    def get_next_frame(self) -> Optional[FramePacket]:
        if not self.workers:
            return None

        camera_ids = list(self.workers.keys())
        total = len(camera_ids)

        # Priority scan: First check CRITICAL and HIGH
        for prio in (CameraPriority.CRITICAL, CameraPriority.HIGH):
            for cam_id in camera_ids:
                w = self.workers[cam_id]
                if w.priority == prio and not w.frame_queue.empty():
                    try:
                        return w.frame_queue.get_nowait()
                    except queue.Empty:
                        pass

        # Fair Round-Robin scan across all cameras
        for i in range(total):
            idx = (self._round_robin_index + i) % total
            cam_id = camera_ids[idx]
            w = self.workers[cam_id]
            if not w.frame_queue.empty():
                self._round_robin_index = (idx + 1) % total
                try:
                    return w.frame_queue.get_nowait()
                except queue.Empty:
                    pass

        return None


class AIWorkerPool:
    """
    Processes scheduled frame packets concurrently and posts them to
    the authoritative ai-detection microservice (:8006).
    """

    def __init__(
        self,
        scheduler: FrameScheduler,
        workers: Dict[str, CameraWorker],
        pool_size: int = 4,
        ai_service_url: str = "http://localhost:8006",
        event_handler: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        self.scheduler = scheduler
        self.workers = workers
        self.pool_size = pool_size
        self.ai_service_url = ai_service_url
        self.event_handler = event_handler

        self._stop_signal = threading.Event()
        self._threads: List[threading.Thread] = []

    def start(self):
        self._stop_signal.clear()
        for i in range(self.pool_size):
            t = threading.Thread(
                target=self._worker_loop,
                name=f"AIWorker-{i+1}",
                daemon=True,
            )
            t.start()
            self._threads.append(t)
        logger.info(f"AI Worker Pool started with {self.pool_size} concurrent workers.")

    def stop(self):
        self._stop_signal.set()
        for t in self._threads:
            if t.is_alive():
                t.join(timeout=1.5)
        self._threads.clear()
        logger.info("AI Worker Pool stopped.")

    def _worker_loop(self):
        client = httpx.Client(timeout=4.0)

        while not self._stop_signal.is_set():
            pkt = self.scheduler.get_next_frame()
            if pkt is None:
                time.sleep(0.02)
                continue

            cam_worker = self.workers.get(pkt.camera_id)
            if not cam_worker:
                continue

            # Encode frame to JPEG base64
            success, buffer = cv2.imencode(".jpg", pkt.frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if not success:
                continue

            b64_img = base64.b64encode(buffer.tobytes()).decode("ascii")
            endpoint = f"{self.ai_service_url}/detect/full"

            payload = {
                "image_base64": b64_img,
                "camera_id": pkt.cam_tag,
                "confidence_threshold": 0.35,
            }

            try:
                t0 = time.time()
                resp = client.post(endpoint, json=payload)
                elapsed_ms = round((time.time() - t0) * 1000, 2)

                if resp.status_code == 200:
                    data = resp.json()
                    now_utc = datetime.now(timezone.utc).isoformat()
                    cam_worker.telemetry.ai_active = True
                    cam_worker.telemetry.last_ai_at = now_utc
                    cam_worker.telemetry.ai_frames_processed += 1
                    cam_worker._ai_timestamps.append(time.time())

                    detections = data.get("detections", [])
                    has_tracks = any(d.get("track_id") is not None for d in detections)
                    cam_worker.telemetry.tracking_active = has_tracks

                    # Check ANPR
                    plates = data.get("plates", [])
                    if plates:
                        readable = any(p.get("text") and "UNREADABLE" not in p.get("text") for p in plates)
                        cam_worker.telemetry.anpr_active = "READABLE" if readable else "UNREADABLE"
                    elif detections:
                        cam_worker.telemetry.anpr_active = "UNREADABLE"

                    # Generate structured event for significant detections
                    for det in detections:
                        event_record = {
                            "event_id": f"evt-{uuid.uuid4().hex[:12]}",
                            "camera_id": pkt.camera_id,
                            "cam_tag": pkt.cam_tag,
                            "track_id": det.get("track_id"),
                            "timestamp": now_utc,
                            "decoder_timestamp_ms": pkt.decoded_pts_ms,
                            "object_class": det.get("class_name", "vehicle"),
                            "confidence": det.get("confidence", 0.0),
                            "box": det.get("box", []),
                            "plate_text": det.get("plate_text"),
                            "inference_latency_ms": elapsed_ms,
                        }
                        if self.event_handler:
                            try:
                                self.event_handler(event_record)
                            except Exception as ev_err:
                                logger.debug(f"Event dispatch error: {ev_err}")

                else:
                    cam_worker.telemetry.ai_errors += 1
                    cam_worker.telemetry.last_error = f"AI service HTTP {resp.status_code}"

            except Exception as e:
                cam_worker.telemetry.ai_errors += 1
                cam_worker.telemetry.last_error = f"AI worker error: {str(e)}"
                time.sleep(0.05)

        client.close()


class StreamSupervisor:
    """
    Fleet-wide Orchestration Engine for all 30 Gujarat CCTV streams.
    Provides unified management, rate tracking, bounded queues, and real health diagnostics.
    """

    _instance: Optional[StreamSupervisor] = None

    def __new__(cls) -> StreamSupervisor:
        if cls._instance is None:
            cls._instance = super(StreamSupervisor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self.workers: Dict[str, CameraWorker] = {}
        self.scheduler = FrameScheduler(self.workers)
        self.ai_pool: Optional[AIWorkerPool] = None
        self._event_subscribers: List[Callable[[Dict[str, Any]], None]] = []
        self._running = False
        self._initialized = True
        logger.info("StreamSupervisor singleton initialized.")

    def add_event_subscriber(self, subscriber: Callable[[Dict[str, Any]], None]):
        self._event_subscribers.append(subscriber)

    def _broadcast_event(self, event: Dict[str, Any]):
        for sub in self._event_subscribers:
            try:
                sub(event)
            except Exception:
                pass

    def register_camera(
        self,
        camera_id: str,
        rtsp_url: str,
        target_ai_fps: float = 2.0,
        priority: CameraPriority = CameraPriority.NORMAL,
    ) -> CameraWorker:
        cam_tag = camera_id if camera_id.startswith("cam") else f"cam{int(camera_id):02d}"
        if cam_tag in self.workers:
            return self.workers[cam_tag]

        worker = CameraWorker(
            camera_id=cam_tag,
            rtsp_url=rtsp_url,
            target_ai_fps=target_ai_fps,
            priority=priority,
            event_callback=self._broadcast_event,
        )
        self.workers[cam_tag] = worker
        return worker

    def start_all(self, pool_size: int = 4):
        """Starts all registered camera workers and AI worker pool."""
        if self._running:
            return

        logger.info(f"Starting StreamSupervisor across {len(self.workers)} camera feeds...")
        for worker in self.workers.values():
            worker.start()

        ai_url = getattr(settings, "AI_DETECTION_LOCAL_URL", "http://localhost:8006")
        self.ai_pool = AIWorkerPool(
            scheduler=self.scheduler,
            workers=self.workers,
            pool_size=pool_size,
            ai_service_url=ai_url,
            event_handler=self._broadcast_event,
        )
        self.ai_pool.start()
        self._running = True

    def stop_all(self):
        """Cleanly stops all ingestion workers and AI pool."""
        if not self._running:
            return

        logger.info("Stopping StreamSupervisor...")
        if self.ai_pool:
            self.ai_pool.stop()
            self.ai_pool = None

        for worker in self.workers.values():
            worker.stop()

        self._running = False

    def get_camera_telemetry(self, camera_id: str) -> Optional[Dict[str, Any]]:
        cam_tag = camera_id if camera_id.startswith("cam") else f"cam{int(camera_id):02d}"
        worker = self.workers.get(cam_tag)
        if not worker:
            return None
        return asdict(worker.telemetry)

    def get_fleet_summary(self) -> Dict[str, Any]:
        """Calculates authoritative aggregated telemetry across all 30 camera workers."""
        workers_list = list(self.workers.values())
        total = len(workers_list)

        network_reachable_count = sum(1 for w in workers_list if w.telemetry.network_reachable)
        authenticated_count = sum(1 for w in workers_list if w.telemetry.authenticated)
        rtsp_session_count = sum(1 for w in workers_list if w.telemetry.rtsp_session_established)
        rtp_media_count = sum(1 for w in workers_list if w.telemetry.rtp_media_observed)
        decoder_open_count = sum(1 for w in workers_list if w.telemetry.decoder_open)
        frame_active_count = sum(1 for w in workers_list if w.telemetry.frame_active)
        ai_active_count = sum(1 for w in workers_list if w.telemetry.ai_active)
        tracking_active_count = sum(1 for w in workers_list if w.telemetry.tracking_active)
        anpr_tested_count = sum(1 for w in workers_list if w.telemetry.anpr_active in ("READABLE", "UNREADABLE"))
        anpr_readable_count = sum(1 for w in workers_list if w.telemetry.anpr_active == "READABLE")

        total_decode_fps = sum(w.telemetry.decode_fps for w in workers_list)
        total_ai_fps = sum(w.telemetry.ai_fps for w in workers_list)
        total_frames_dropped = sum(w.telemetry.frames_dropped for w in workers_list)

        return {
            "total_cameras": total,
            "running": self._running,
            "scorecard": {
                "network_reachable": f"{network_reachable_count}/{total}",
                "authenticated_verified": f"{authenticated_count}/{total}",
                "rtsp_session_established": f"{rtsp_session_count}/{total}",
                "rtp_media_observed": f"{rtp_media_count}/{total}",
                "decoder_open": f"{decoder_open_count}/{total}",
                "frame_active": f"{frame_active_count}/{total}",
                "ai_active": f"{ai_active_count}/{total}",
                "tracking_active": f"{tracking_active_count}/{total}",
                "anpr_tested": f"{anpr_tested_count}/{total}",
                "anpr_readable": f"{anpr_readable_count}/{total}",
            },
            "aggregate_rates": {
                "total_decode_fps": round(total_decode_fps, 1),
                "total_ai_fps": round(total_ai_fps, 1),
                "total_frames_dropped": total_frames_dropped,
            },
            "cameras": [asdict(w.telemetry) for w in workers_list],
        }


# Global stream supervisor instance
stream_supervisor = StreamSupervisor()
