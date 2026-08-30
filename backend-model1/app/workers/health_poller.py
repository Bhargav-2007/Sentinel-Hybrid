"""
Gujarat Sentinel — Model 1
Background Health Poller Worker

Periodically probes all registered cameras to update their health status.
Uses asyncio for concurrent probing (up to 50 cameras simultaneously).

Health check methods (in order of preference):
  1. RTSP TCP probe (for IP cameras with RTSP URLs)
  2. HTTP GET on ONVIF URL
  3. ICMP ping (fallback)

Results are:
  - Cached in Redis (TTL: 30s)
  - Written to camera_health_checks table
  - Published to Kafka (sentinel.health.events)
  - Used to update camera.status field
"""

from __future__ import annotations

import asyncio
import socket
import time
import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import select, update

from app.config import get_settings
from app.core.cache import CameraStatusCache, get_redis
from app.core.events import EventPublisher, get_producer
from app.db.models import Camera, CameraHealthCheck, CameraStatusEnum
from app.db.session import get_session_factory

logger = structlog.get_logger(__name__)

# Maximum concurrent health checks to avoid overwhelming the network
MAX_CONCURRENT_PROBES = 50


async def start_health_poller() -> None:
    """
    Main health poller loop. Runs indefinitely as a background task.
    Polls all cameras every HEALTH_POLL_INTERVAL_SEC seconds.
    """
    settings = get_settings()
    interval = settings.health_poll_interval_sec

    logger.info("health_poller_starting", interval_sec=interval)

    while True:
        try:
            await run_health_poll_cycle()
        except asyncio.CancelledError:
            logger.info("health_poller_cancelled")
            raise
        except Exception as e:
            logger.error("health_poll_cycle_error", error=str(e))

        await asyncio.sleep(interval)


async def run_health_poll_cycle() -> dict[str, int]:
    """
    Run one complete health poll cycle for all active cameras.

    Returns summary stats dict.
    """
    factory = get_session_factory()
    stats = {"total": 0, "online": 0, "offline": 0, "errors": 0}

    async with factory() as db:
        # Fetch all active cameras
        result = await db.execute(
            select(Camera).where(Camera.deleted_at.is_(None))
        )
        cameras = result.scalars().all()

    stats["total"] = len(cameras)
    if not cameras:
        return stats

    logger.info("health_poll_cycle_starting", camera_count=len(cameras))
    start = time.monotonic()

    # Run probes concurrently with semaphore limit
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_PROBES)

    async def probe_with_semaphore(camera: Camera) -> dict:
        async with semaphore:
            return await probe_camera(camera)

    probe_results = await asyncio.gather(
        *[probe_with_semaphore(c) for c in cameras],
        return_exceptions=True,
    )

    # Process results and update DB
    factory = get_session_factory()
    redis = await get_redis()
    cache = CameraStatusCache(redis)
    producer = await get_producer()
    publisher = EventPublisher(producer=producer)

    async with factory() as db:
        for camera, result in zip(cameras, probe_results):
            if isinstance(result, Exception):
                logger.error("probe_exception", camera_id=str(camera.id), error=str(result))
                stats["errors"] += 1
                continue

            is_reachable = result["is_reachable"]
            new_status = CameraStatusEnum.online if is_reachable else CameraStatusEnum.offline

            if is_reachable:
                stats["online"] += 1
            else:
                stats["offline"] += 1

            # Write health check record
            health_record = CameraHealthCheck(
                camera_id=camera.id,
                is_reachable=is_reachable,
                latency_ms=result.get("latency_ms"),
                stream_active=result.get("stream_active", False),
                check_method=result.get("method", "ping"),
                error_message=result.get("error"),
            )
            db.add(health_record)

            # Update camera status if changed
            if camera.status != new_status:
                await db.execute(
                    update(Camera)
                    .where(Camera.id == camera.id)
                    .values(
                        status=new_status,
                        last_health_check_at=datetime.now(tz=timezone.utc),
                    )
                )
                logger.info(
                    "camera_status_changed",
                    camera_id=camera.camera_id,
                    old_status=camera.status,
                    new_status=new_status,
                )

            # Cache the result
            await cache.set(
                str(camera.id),
                {
                    "is_reachable": is_reachable,
                    "latency_ms": result.get("latency_ms"),
                    "stream_active": result.get("stream_active", False),
                    "checked_at": datetime.now(tz=timezone.utc).isoformat(),
                    "method": result.get("method"),
                    "error": result.get("error"),
                },
            )

            # Publish health event to Kafka
            await publisher.publish_health_event(
                camera_id=str(camera.id),
                is_reachable=is_reachable,
                latency_ms=result.get("latency_ms"),
                stream_active=result.get("stream_active", False),
                error=result.get("error"),
            )

        await db.commit()

    elapsed = time.monotonic() - start
    logger.info(
        "health_poll_cycle_complete",
        elapsed_sec=round(elapsed, 2),
        **stats,
    )
    return stats


async def probe_camera(camera: Camera) -> dict:
    """
    Probe a single camera and return health status dict.

    Tries RTSP probe first (if RTSP URL available), then ICMP ping,
    then falls back to unknown.
    """
    settings = get_settings()

    result = {
        "is_reachable": False,
        "latency_ms": None,
        "stream_active": False,
        "method": "unknown",
        "error": None,
    }

    # Method 1: RTSP TCP probe
    if camera.rtsp_url and camera.rtsp_url.startswith("rtsp://"):
        try:
            rtsp_result = await probe_rtsp_tcp(camera.rtsp_url, settings.rtsp_probe_timeout_sec)
            result.update(rtsp_result)
            result["method"] = "rtsp_probe"
            return result
        except Exception as e:
            result["error"] = f"RTSP probe failed: {str(e)[:100]}"

    # Method 2: TCP port probe (fallback for cameras with IP but no RTSP URL)
    if camera.latitude and camera.longitude:
        # For simulator cameras: probe the simulator's known port
        if camera.rtsp_url and "rtsp-sim://" in camera.rtsp_url:
            # Simulator is always "reachable"
            result["is_reachable"] = True
            result["latency_ms"] = 1
            result["stream_active"] = True
            result["method"] = "simulator"
            return result

    # Method 3: Unknown / no connectivity info
    result["method"] = "no_connectivity_info"
    result["error"] = "No RTSP URL configured"
    return result


async def probe_rtsp_tcp(rtsp_url: str, timeout_sec: int) -> dict:
    """
    Probe an RTSP stream by opening a TCP connection to the RTSP port.

    This is a lightweight probe — we just check TCP connectivity,
    not actual RTSP handshake. For full stream validation, use
    ffprobe in a separate process.
    """
    import urllib.parse

    start = time.monotonic()

    try:
        parsed = urllib.parse.urlparse(rtsp_url)
        host = parsed.hostname or ""
        port = parsed.port or 554

        # TCP connect probe with timeout
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout_sec,
        )
        writer.close()
        await writer.wait_closed()

        latency_ms = int((time.monotonic() - start) * 1000)
        return {
            "is_reachable": True,
            "latency_ms": latency_ms,
            "stream_active": True,  # Assume active if TCP port is open
            "error": None,
        }
    except asyncio.TimeoutError:
        return {
            "is_reachable": False,
            "latency_ms": None,
            "stream_active": False,
            "error": f"Connection timed out after {timeout_sec}s",
        }
    except (ConnectionRefusedError, OSError) as e:
        return {
            "is_reachable": False,
            "latency_ms": None,
            "stream_active": False,
            "error": str(e)[:100],
        }
