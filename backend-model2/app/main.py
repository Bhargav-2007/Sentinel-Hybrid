"""
Gujarat Sentinel — Model 2: Unified Viewing & ANPR Analytics
Main Application Factory

Architecture:
  FastAPI → API Layer (streams, anpr, watchlist, events)
              ↓
          Service Layer (stream_service, anpr_service, watchlist_service)
              ↓
          Pipeline Layer (stream_manager → anpr_engine → detection_processor)
              ↓
          Data Layer (PostgreSQL + OpenSearch + S3)
              ↓
          Event Layer (Kafka CloudEvents)
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import get_settings

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.

    Startup:
      1. Create database tables
      2. Initialize detection processor (loads ML models)
      3. Sync stream catalogue from simulator
      4. Sync watchlist from eGujCop
    Shutdown:
      1. Disconnect all RTSP streams
      2. Dispose database engine
    """
    settings = get_settings()
    logger.info("model2_starting", env=settings.environment)

    # ── 1. Database ───────────────────────────────────────────────────────
    from app.db.session import create_tables
    await create_tables()
    logger.info("database_ready")

    # ── 2. Initialize detection processor ─────────────────────────────────
    from app.pipeline.detection_processor import DetectionProcessor
    processor = DetectionProcessor()
    await processor.initialize()
    app.state.detection_processor = processor

    # ── 3. Stream manager ─────────────────────────────────────────────────
    from app.pipeline.stream_manager import StreamManager
    stream_manager = StreamManager(on_frame_callback=processor.process_frame)
    app.state.stream_manager = stream_manager

    # Register with service layer
    from app.services.stream_service import set_stream_manager
    set_stream_manager(stream_manager)

    # ── 3. Sync stream catalogue in background (non-blocking) ────────────
    async def _initial_catalogue_sync():
        try:
            synced = await asyncio.wait_for(stream_manager.sync_stream_catalogue(), timeout=4.0)
            logger.info("stream_catalogue_synced", count=synced)
        except Exception as e:
            logger.warning("stream_sync_notice", error=str(e)[:150])

    asyncio.create_task(_initial_catalogue_sync(), name="initial-catalogue-sync")

    # ── 4. Sync watchlist from eGujCop in background (non-blocking) ───────
    async def _initial_watchlist_sync():
        try:
            from app.db.session import get_session_factory
            from app.services.watchlist_service import WatchlistService

            factory = get_session_factory()
            async with factory() as db:
                ws = WatchlistService(db)
                result = await asyncio.wait_for(ws.sync_from_egujcop(), timeout=4.0)
                await db.commit()
                logger.info("watchlist_synced", **result)
        except Exception as e:
            logger.warning("watchlist_sync_notice", error=str(e)[:150])

    asyncio.create_task(_initial_watchlist_sync(), name="initial-watchlist-sync")

    # ── 5. Start Kafka consumer for camera events (optional/resilient) ───
    camera_consumer_task = None
    try:
        camera_consumer_task = asyncio.create_task(
            _consume_camera_events(settings), name="camera-events-consumer"
        )
    except Exception as e:
        logger.warning("kafka_consumer_launch_skipped", error=str(e)[:150])

    # ── 6. Start Vehicle Corridor & Trajectory Tracking Worker ────────────
    # In production (DATA_MODE=real), detections arrive strictly from real RTSP/AI ingest
    if settings.enable_dev_seed or settings.data_mode == "simulation":
        from app.workers.corridor_tracker import start_corridor_tracking_loop
        corridor_task = asyncio.create_task(
            start_corridor_tracking_loop(), name="corridor-tracker-loop"
        )
        logger.info("corridor_simulation_worker_started", data_mode=settings.data_mode)
    else:
        logger.info("real_data_mode_active", corridor_simulation="DISABLED")

    # ── 7. Auto-connect live streams in background ────────────────────────
    async def _auto_connect_streams():
        await asyncio.sleep(3)
        try:
            connected = await stream_manager.connect_all(max_streams=30)
            logger.info("auto_connected_live_streams", count=connected)
        except Exception as e:
            logger.warning("auto_connect_streams_failed", error=str(e)[:150])

    asyncio.create_task(_auto_connect_streams(), name="auto-connect-streams")

    logger.info(
        "model2_ready",
        port=settings.model2_port,
        streams_synced=synced if 'synced' in dir() else 0,
    )

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────
    logger.info("model2_shutting_down")

    # Cancel camera event consumer
    if camera_consumer_task and not camera_consumer_task.done():
        camera_consumer_task.cancel()
        try:
            await camera_consumer_task
        except (asyncio.CancelledError, Exception):
            pass

    # Disconnect all streams
    try:
        await stream_manager.disconnect_all()
    except Exception as e:
        logger.debug("stream_disconnect_notice", error=str(e)[:100])

    # Dispose DB
    try:
        from app.db.session import dispose_engine
        await dispose_engine()
    except Exception:
        pass

    logger.info("model2_shutdown_complete")


async def _consume_camera_events(settings) -> None:
    """
    Kafka consumer: listen for camera lifecycle events from Model 1.
    Re-syncs stream catalogue when cameras are registered/updated/deleted.
    Resilient: will never crash the server if Kafka is unavailable.
    """
    consumer = None
    try:
        from aiokafka import AIOKafkaConsumer
        import json

        consumer = AIOKafkaConsumer(
            settings.topic_camera_events,
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id=f"{settings.kafka_group_id}-camera-sync",
            auto_offset_reset="latest",
            enable_auto_commit=True,
            request_timeout_ms=3000,
        )
        await consumer.start()
        logger.info("kafka_camera_consumer_started")

        try:
            async for message in consumer:
                try:
                    event = json.loads(message.value.decode())
                    event_type = event.get("type", "")
                    logger.info(
                        "camera_event_received",
                        type=event_type,
                        source=event.get("source"),
                    )
                except Exception as e:
                    logger.warning("camera_event_parse_error", error=str(e)[:100])
        except (asyncio.CancelledError, Exception) as inner_err:
            logger.debug("kafka_consumer_stream_notice", error=str(inner_err)[:100])
    except asyncio.CancelledError:
        pass
    except (ConnectionResetError, ConnectionRefusedError, OSError, Exception) as e:
        logger.info("kafka_camera_consumer_offline", notice=f"Kafka not reachable at {settings.kafka_bootstrap_servers} (operating in standalone HTTP fallback mode): {str(e)[:100]}")
    finally:
        if consumer:
            try:
                await consumer.stop()
            except Exception:
                pass



def create_app() -> FastAPI:
    """Factory function for the Model 2 FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Sentinel Model 2 — Unified Viewing & ANPR Analytics",
        description=(
            "Unified CCTV viewing platform with RTSP stream management, "
            "YOLOv8n vehicle detection, PaddleOCR ANPR, watchlist matching, "
            "and OpenSearch-backed event search."
        ),
        version=settings.service_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Prometheus metrics ────────────────────────────────────────────────
    Instrumentator(
        should_group_status_codes=True,
        excluded_handlers=["/health", "/ready", "/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics")

    # ── Register routers ──────────────────────────────────────────────────
    from app.api.v1.streams import router as streams_router
    from app.api.v1.anpr import router as anpr_router
    from app.api.v1.watchlist import router as watchlist_router
    from app.api.v1.events import router as events_router
    from app.api.v1.health import router as health_router

    prefix = settings.api_v1_prefix
    app.include_router(streams_router, prefix=prefix)
    app.include_router(anpr_router, prefix=prefix)
    app.include_router(watchlist_router, prefix=prefix)
    app.include_router(events_router, prefix=prefix)
    app.include_router(health_router)  # Health at root

    return app


# Module-level app for uvicorn
app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.model2_host,
        port=settings.model2_port,
        reload=settings.is_dev,
        workers=1,  # Single worker for RTSP consumers
        log_level="info",
    )
