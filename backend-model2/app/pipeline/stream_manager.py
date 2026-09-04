"""
Gujarat Sentinel — Model 2
RTSP Stream Manager

Manages the lifecycle of RTSP consumers for each camera stream:
  1. Discover streams from the simulator /api/ingest endpoint
  2. Maintain RTSP TCP connections with exponential backoff reconnection
  3. Decode frames using PyAV (FFmpeg bindings)
  4. Route frames to the analytics pipeline (YOLO + ANPR)
  5. Track stream state (live/offline/error) in DB + Redis

Key requirements met:
  - RTSP over TCP (not UDP) per Sentinel specification
  - PTS-based timing (not wall clock) for frame timestamps
  - Exponential backoff (5s → 10s → 20s → 40s → 60s cap) on reconnect
  - Frame skipping for ANPR efficiency (process every Nth frame)
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import av
import httpx
import numpy as np
import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import StreamState, StreamStatusEnum
from app.db.session import get_session_factory

logger = structlog.get_logger(__name__)


class RTSPConsumer:
    """
    RTSP consumer for a single camera stream.

    Runs in a dedicated asyncio task. Reads frames from an RTSP TCP
    connection, converts to numpy arrays, and pushes to the analytics
    callback for YOLO + ANPR processing.

    Implements exponential backoff reconnection:
      5s → 10s → 20s → 40s → 60s (capped)
    """

    def __init__(
        self,
        stream_id: str,
        camera_id: str,
        rtsp_url: str,
        on_frame: Any,     # Callback: async (stream_id, frame_np, pts_ms, metadata) -> None
        metadata: dict[str, Any] | None = None,
    ):
        self.stream_id = stream_id
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.on_frame = on_frame
        self.metadata = metadata or {}
        self._running = False
        self._task: asyncio.Task | None = None
        self._reconnect_count = 0
        self._frames_decoded = 0
        self._last_frame_time: float = 0.0
        self.settings = get_settings()

    async def start(self) -> None:
        """Start the RTSP consumer task."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._consume_loop())
        logger.info("rtsp_consumer_started", stream_id=self.stream_id, url=self.rtsp_url[:60])

    async def stop(self) -> None:
        """Stop the RTSP consumer gracefully."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("rtsp_consumer_stopped", stream_id=self.stream_id)

    @property
    def is_running(self) -> bool:
        return self._running

    async def _consume_loop(self) -> None:
        """Main consumption loop with reconnection logic."""
        while self._running:
            try:
                await self._update_status(StreamStatusEnum.connecting)
                await self._read_stream()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                self._reconnect_count += 1
                delay = self._backoff_delay()
                logger.warning(
                    "rtsp_connection_failed",
                    stream_id=self.stream_id,
                    error=str(e)[:200],
                    reconnect_count=self._reconnect_count,
                    next_retry_sec=delay,
                )
                await self._update_status(
                    StreamStatusEnum.reconnecting,
                    error_message=str(e)[:500],
                )

                if self._reconnect_count > self.settings.rtsp_max_reconnect_attempts:
                    logger.error(
                        "rtsp_max_reconnects_exceeded",
                        stream_id=self.stream_id,
                        max_attempts=self.settings.rtsp_max_reconnect_attempts,
                    )
                    await self._update_status(
                        StreamStatusEnum.error,
                        error_message=f"Max reconnect attempts ({self.settings.rtsp_max_reconnect_attempts}) exceeded",
                    )
                    self._running = False
                    return

                await asyncio.sleep(delay)

    async def _read_stream(self) -> None:
        """
        Open RTSP stream and decode frames.

        Uses PyAV (FFmpeg bindings) for RTSP TCP transport.
        Processes every Nth frame (configurable) for ANPR.
        Uses PTS (Presentation Timestamp) for accurate frame timing.
        """
        options = {
            "rtsp_transport": self.settings.rtsp_transport,  # MUST be TCP
            "stimeout": str(self.settings.rtsp_reconnect_delay_sec * 1_000_000),
            "buffer_size": "1048576",  # 1MB buffer
            "max_delay": "500000",
            "analyzeduration": "2000000",
            "probesize": "1000000",
        }

        # PyAV/FFmpeg RTSP connection — runs in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        container = await loop.run_in_executor(
            None,
            lambda: av.open(self.rtsp_url, options=options, timeout=10),
        )

        try:
            # Reset reconnect counter on successful connection
            self._reconnect_count = 0
            await self._update_status(StreamStatusEnum.live)

            video_stream = container.streams.video[0]
            # Don't re-thread — we control the loop
            video_stream.thread_type = "AUTO"

            frame_skip = self.settings.rtsp_frame_skip
            frame_count = 0

            for packet in container.demux(video_stream):
                if not self._running:
                    break

                try:
                    for frame in packet.decode():
                        frame_count += 1
                        self._frames_decoded += 1

                        # PTS-based timing (per Sentinel specification - never rely on arrival time)
                        pts_ms = int(frame.pts * frame.time_base * 1000) if (frame.pts is not None and frame.time_base is not None) else 0

                        # Process every Nth frame for ANPR
                        if frame_count % frame_skip == 0:
                            # Convert AV frame to numpy array (BGR for OpenCV)
                            frame_np = frame.to_ndarray(format="bgr24")

                            self._last_frame_time = time.monotonic()

                            # Push to analytics pipeline (async)
                            try:
                                await self.on_frame(
                                    stream_id=self.stream_id,
                                    frame=frame_np,
                                    pts_ms=pts_ms,
                                    metadata={
                                        "camera_id": self.camera_id,
                                        "frame_number": frame_count,
                                        **self.metadata,
                                    },
                                )
                            except Exception as e:
                                logger.error(
                                    "analytics_callback_error",
                                    stream_id=self.stream_id,
                                    error=str(e)[:200],
                                )

                        # Yield control to event loop periodically
                        if frame_count % 100 == 0:
                            await asyncio.sleep(0)
                except (av.AVError, ValueError, UnicodeDecodeError) as decode_err:
                    # Integration Reference Section 3: DON'T — Treat decode warnings at join as fatal.
                    # Attaching mid-stream can produce RPS / POC reference errors until first IDR arrives.
                    logger.debug(
                        "decoder_warning_non_fatal",
                        stream_id=self.stream_id,
                        warning=str(decode_err),
                    )
                    continue

        finally:
            container.close()

    def _backoff_delay(self) -> float:
        """Calculate exponential backoff delay with 2s start and 30s cap (per Integration Reference)."""
        base = float(self.settings.rtsp_reconnect_delay_sec or 2.0)
        delay = min(base * (2 ** max(0, self._reconnect_count - 1)), 30.0)
        return delay

    async def _update_status(
        self,
        status: StreamStatusEnum,
        error_message: str | None = None,
    ) -> None:
        """Update stream state in database."""
        factory = get_session_factory()
        try:
            async with factory() as db:
                await db.execute(
                    update(StreamState)
                    .where(StreamState.stream_id == self.stream_id)
                    .values(
                        status=status,
                        error_message=error_message,
                        reconnect_count=self._reconnect_count,
                        last_frame_at=datetime.now(tz=timezone.utc) if status == StreamStatusEnum.live else None,
                        updated_at=datetime.now(tz=timezone.utc),
                    )
                )
                await db.commit()
        except Exception as e:
            logger.warning("stream_status_update_failed", error=str(e)[:100])


class StreamManager:
    """
    Manages all RTSP consumers.

    Responsibilities:
      - Discover streams from the simulator /api/ingest endpoint
      - Start/stop individual stream consumers
      - Track active streams in memory and DB
      - Provide stream catalogue for the API layer
    """

    def __init__(self, on_frame_callback: Any):
        self.consumers: dict[str, RTSPConsumer] = {}
        self.on_frame = on_frame_callback
        self.settings = get_settings()
        self._discovery_task: asyncio.Task | None = None

    async def discover_streams(self) -> list[dict[str, Any]]:
        """
        Fetch stream catalogue from the live camera gateway.

        Supports both the live.corp8.cloud API format:
          {cameras: [{id, name, location, codec, rtsp_url, webrtc_url, hls_live_url, ...}]}
        and the legacy sentinel simulator format:
          [{stream_id, name, rtsp_url, ...}]

        Always start from the catalogue — never hard-code endpoints.
        """
        sources = [
            self.settings.sentinel_ingest_api,
            "http://rtsp-simulator:8888/api/ingest",
            "http://localhost:8888/api/ingest",
        ]

        for src in sources:
            try:
                async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                    resp = await client.get(src)
                    if resp.status_code == 200:
                        data = resp.json()
                        if isinstance(data, dict) and "cameras" in data:
                            streams = data["cameras"]
                        elif isinstance(data, list):
                            streams = data
                        else:
                            streams = []

                        if streams:
                            logger.info("streams_discovered", count=len(streams), source=src)
                            return streams
            except Exception as err:
                logger.debug("stream_discovery_source_failed", source=src, error=str(err))

        # If discovery sources fail, do not synthesize fake cameras with live=True
        logger.warning("stream_discovery_failed_no_catalogue_found")
        return []

    @staticmethod
    def _normalise_ingest_record(raw: dict[str, Any]) -> dict[str, Any]:
        """
        Normalise a single record from /api/ingest into our internal schema.

        live.corp8.cloud uses:
          id, name, location (string), codec, live, width, height, fps,
          bitrate_kbps, rtsp_url, webrtc_url, hls_live_url

        Legacy simulator uses:
          stream_id, camera_id, name, rtsp_url, hls_url, webrtc_url,
          codec, resolution, frame_rate, bitrate_kbps, department,
          location (dict with latitude/longitude)
        """
        stream_id = str(raw.get("id") or raw.get("stream_id") or raw.get("number", ""))

        # RTSP URL — prefer explicit field, fall back to constructing from host+id
        rtsp_url = raw.get("rtsp_url", "")

        # HLS URL normalisation
        hls_url = raw.get("hls_live_url") or raw.get("hls_url")

        # Resolution string
        w = raw.get("width", 0)
        h = raw.get("height", 0)
        resolution = f"{w}x{h}" if w and h else raw.get("resolution")

        # Frame rate
        fps = raw.get("fps") or raw.get("frame_rate")

        # Location — live API sends a string, legacy sends a dict
        location_raw = raw.get("location", {})
        if isinstance(location_raw, dict):
            district = location_raw.get("district")
            latitude = location_raw.get("latitude")
            longitude = location_raw.get("longitude")
        else:
            # String location from live.corp8.cloud — e.g. "06 Timbavadi gate-Junagadh"
            district = None
            latitude = None
            longitude = None

        return {
            "stream_id": stream_id,
            "camera_id": raw.get("camera_id", f"LIVE-CAM-{stream_id}"),
            "name": raw.get("name", f"Camera {stream_id}"),
            "location_label": location_raw if isinstance(location_raw, str) else str(location_raw),
            "rtsp_url": rtsp_url,
            "hls_url": hls_url,
            "webrtc_url": raw.get("webrtc_url"),
            "codec": raw.get("codec") or None,
            "resolution": resolution,
            "frame_rate": fps,
            "bitrate_kbps": raw.get("bitrate_kbps") or None,
            "district": district,
            "latitude": latitude,
            "longitude": longitude,
            "department": raw.get("department"),
            "live": raw.get("live", True),
            "_raw": raw,
        }

    async def sync_stream_catalogue(self) -> int:
        """
        Sync discovered streams into the database.
        Returns number of streams synced.
        """
        raw_streams = await self.discover_streams()
        if not raw_streams:
            return 0

        streams = [self._normalise_ingest_record(r) for r in raw_streams]

        factory = get_session_factory()
        synced = 0

        async with factory() as db:
            for stream_data in streams:
                stream_id = stream_data["stream_id"]
                if not stream_id:
                    continue

                existing = await db.execute(
                    select(StreamState).where(StreamState.stream_id == stream_id)
                )
                existing_row = existing.scalar_one_or_none()

                if existing_row:
                    existing_row.rtsp_url = stream_data["rtsp_url"] or existing_row.rtsp_url
                    existing_row.hls_url = stream_data["hls_url"]
                    existing_row.webrtc_url = stream_data["webrtc_url"]
                    existing_row.name = stream_data["name"] or existing_row.name
                    if stream_data["codec"]:
                        existing_row.codec = stream_data["codec"]
                    if stream_data["resolution"]:
                        existing_row.resolution = stream_data["resolution"]
                    if stream_data["frame_rate"]:
                        existing_row.frame_rate = float(stream_data["frame_rate"])
                    if stream_data["bitrate_kbps"]:
                        existing_row.bitrate_kbps = int(stream_data["bitrate_kbps"])
                else:
                    new_stream = StreamState(
                        stream_id=stream_id,
                        camera_id=stream_data["camera_id"],
                        name=stream_data["name"],
                        rtsp_url=stream_data["rtsp_url"],
                        hls_url=stream_data["hls_url"],
                        webrtc_url=stream_data["webrtc_url"],
                        codec=stream_data["codec"],
                        resolution=stream_data["resolution"],
                        frame_rate=float(stream_data["frame_rate"]) if stream_data["frame_rate"] else None,
                        bitrate_kbps=int(stream_data["bitrate_kbps"]) if stream_data["bitrate_kbps"] else None,
                        status=StreamStatusEnum.offline,
                        department=stream_data["department"],
                        district=stream_data["district"],
                        latitude=stream_data["latitude"],
                        longitude=stream_data["longitude"],
                        extra_metadata=stream_data["_raw"],
                    )
                    db.add(new_stream)
                synced += 1

            await db.commit()

        logger.info("stream_catalogue_synced", count=synced)
        return synced


    async def connect_stream(self, stream_id: str) -> bool:
        """Start consuming a specific stream."""
        if stream_id in self.consumers and self.consumers[stream_id].is_running:
            logger.info("stream_already_connected", stream_id=stream_id)
            return True

        # Fetch stream details from DB
        factory = get_session_factory()
        async with factory() as db:
            result = await db.execute(
                select(StreamState).where(StreamState.stream_id == stream_id)
            )
            stream = result.scalar_one_or_none()

        if not stream:
            logger.warning("stream_not_found", stream_id=stream_id)
            return False

        consumer = RTSPConsumer(
            stream_id=stream_id,
            camera_id=stream.camera_id,
            rtsp_url=stream.rtsp_url,
            on_frame=self.on_frame,
            metadata={
                "district": stream.district,
                "latitude": stream.latitude,
                "longitude": stream.longitude,
                "department": stream.department,
            },
        )
        self.consumers[stream_id] = consumer
        await consumer.start()

        # Update analytics state
        async with factory() as db:
            await db.execute(
                update(StreamState)
                .where(StreamState.stream_id == stream_id)
                .values(analytics_active=True)
            )
            await db.commit()

        return True

    async def disconnect_stream(self, stream_id: str) -> bool:
        """Stop consuming a specific stream."""
        consumer = self.consumers.get(stream_id)
        if consumer:
            await consumer.stop()
            del self.consumers[stream_id]

        factory = get_session_factory()
        async with factory() as db:
            await db.execute(
                update(StreamState)
                .where(StreamState.stream_id == stream_id)
                .values(
                    status=StreamStatusEnum.offline,
                    analytics_active=False,
                )
            )
            await db.commit()
        return True

    async def connect_all(self, max_streams: int | None = None) -> int:
        """Connect to all discovered streams (up to limit)."""
        limit = max_streams or self.settings.max_concurrent_streams
        factory = get_session_factory()
        async with factory() as db:
            result = await db.execute(
                select(StreamState).where(StreamState.status != StreamStatusEnum.error).limit(limit)
            )
            streams = result.scalars().all()

        connected = 0
        for stream in streams:
            if stream.stream_id not in self.consumers:
                success = await self.connect_stream(stream.stream_id)
                if success:
                    connected += 1
                # Stagger connections to avoid overwhelming the simulator
                await asyncio.sleep(0.2)

        logger.info("streams_connected", count=connected, total_available=len(streams))
        return connected

    async def disconnect_all(self) -> None:
        """Stop all stream consumers."""
        for stream_id in list(self.consumers.keys()):
            await self.disconnect_stream(stream_id)
        logger.info("all_streams_disconnected")

    def get_active_stream_ids(self) -> list[str]:
        """Return IDs of currently active streams."""
        return [sid for sid, consumer in self.consumers.items() if consumer.is_running]

    @property
    def active_count(self) -> int:
        return len([c for c in self.consumers.values() if c.is_running])
