"""
Gujarat Sentinel — Model 1
FastAPI Application Factory

This is the entry point for the Model 1 service.
The app factory pattern allows clean testing by importing create_app()
without starting side effects (Kafka, DB connections).

Middleware stack (outside-in order):
  1. Traefik/nginx: TLS termination, rate limiting (not in-app)
  2. CORS middleware
  3. OpenTelemetry tracing middleware
  4. Structured logging middleware
  5. Request ID injection
  6. Prometheus metrics middleware
  7. Exception handler
  8. Router dispatch
"""

from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1 import cameras, gis, health
from app.config import get_settings
from app.core.cache import close_redis
from app.core.events import close_producer, get_producer
from app.core.telemetry import setup_telemetry
from app.db.session import create_tables, dispose_engine

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.

    Startup:
      1. Set up OpenTelemetry tracing
      2. Verify database connectivity (create tables in dev)
      3. Start Kafka producer
      4. Warm up Redis connection pool
      5. Start background health polling worker

    Shutdown (reverse order):
      1. Cancel health poller
      2. Stop Kafka producer (flush remaining messages)
      3. Close Redis pool
      4. Dispose database engine
    """
    settings = get_settings()

    # ── Startup ────────────────────────────────────────────────────────────
    logger.info(
        "sentinel_model1_starting",
        service=settings.model1_service_name,
        version=settings.service_version,
        environment=settings.environment,
    )

    # Set up OpenTelemetry
    setup_telemetry(service_name=settings.model1_service_name)

    # Create database tables (dev only — production uses Alembic)
    if settings.is_dev:
        try:
            await create_tables()
        except Exception as e:
            logger.warning("db_table_creation_warning", error=str(e))

    # Sync official Sentinel /api/ingest catalogue into PostGIS/database
    try:
        from app.services.catalogue_sync import sync_catalogue_into_registry
        synced = await sync_catalogue_into_registry()
        logger.info("catalogue_sync_completed", count=synced)
    except Exception as e:
        logger.warning("catalogue_sync_notice", error=str(e))

    # Pre-warm Kafka producer
    try:
        await get_producer()
        logger.info("kafka_producer_ready")
    except Exception as e:
        logger.error("kafka_producer_startup_failed", error=str(e))
        # Don't fail startup — service can run without Kafka (degraded mode)

    # Start background workers
    import asyncio
    from app.workers.health_poller import start_health_poller

    health_poller_task = asyncio.create_task(start_health_poller())
    logger.info("health_poller_started")

    # Periodic catalogue resync every 5 minutes (picks up new cameras from sandbox)
    async def _periodic_catalogue_resync():
        while True:
            await asyncio.sleep(300)  # 5 minutes
            try:
                from app.services.catalogue_sync import sync_catalogue_into_registry
                count = await sync_catalogue_into_registry()
                logger.info("periodic_catalogue_resync", synced=count)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.warning("periodic_resync_error", error=str(e)[:100])

    resync_task = asyncio.create_task(_periodic_catalogue_resync())
    logger.info("periodic_catalogue_resync_started", interval_sec=300)

    logger.info(
        "sentinel_model1_ready",
        host=settings.model1_host,
        port=settings.model1_port,
        docs=f"http://{settings.model1_host}:{settings.model1_port}/docs",
    )

    yield  # Application is running

    # ── Shutdown ───────────────────────────────────────────────────────────
    logger.info("sentinel_model1_shutting_down")

    health_poller_task.cancel()
    try:
        await health_poller_task
    except asyncio.CancelledError:
        pass

    resync_task.cancel()
    try:
        await resync_task
    except asyncio.CancelledError:
        pass

    await close_producer()
    await close_redis()
    await dispose_engine()

    logger.info("sentinel_model1_stopped")


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI app."""
    settings = get_settings()

    app = FastAPI(
        title="Sentinel Model 1 — CCTV Registry & GIS",
        description=(
            "Gujarat Sentinel Hybrid Platform — Centralised CCTV Registry and GIS.\n\n"
            "Manage camera metadata, visualise on GIS maps, analyse coverage gaps, "
            "and monitor camera health for the entire Gujarat state CCTV network."
        ),
        version=settings.service_version,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=settings.openapi_url,
        lifespan=lifespan,
        # OpenAPI tags for documentation organisation
        openapi_tags=[
            {"name": "cameras", "description": "Camera registry CRUD operations"},
            {"name": "gis", "description": "GIS mapping, coverage and gap analysis"},
            {"name": "health", "description": "Camera health monitoring"},
            {"name": "audit", "description": "Audit trail queries"},
            {"name": "system", "description": "Service health and metrics"},
        ],
    )

    # ── Middleware ─────────────────────────────────────────────────────────

    # CORS (tighten allowed_origins in production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Request ID and logging middleware ──────────────────────────────────
    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next: Any) -> Response:
        """Inject request ID and structured logging context per request."""
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.perf_counter()

        # Bind context for all log lines within this request
        with structlog.contextvars.bound_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        ):
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000

            logger.info(
                "http_request",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Service"] = settings.model1_service_name
            return response

    # ── Prometheus metrics ────────────────────────────────────────────────
    Instrumentator(
        should_group_status_codes=False,
        should_respect_env_var=False,
        excluded_handlers=["/health", "/ready", "/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=True)

    # ── Global exception handlers ──────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all exception handler — prevents stack traces leaking to clients."""
        logger.error(
            "unhandled_exception",
            exc_type=type(exc).__name__,
            exc_message=str(exc),
            path=request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred. Check service logs.",
                "trace_id": getattr(request.state, "trace_id", None),
            },
        )

    # ── Routers ───────────────────────────────────────────────────────────
    api_prefix = settings.api_v1_prefix

    app.include_router(cameras.router, prefix=api_prefix)
    app.include_router(gis.router, prefix=api_prefix)
    app.include_router(health.router)

    # Register department router
    from app.api.v1 import departments
    app.include_router(departments.router, prefix=api_prefix)

    # Register audit router
    from app.api.v1 import audit
    app.include_router(audit.router, prefix=api_prefix)

    return app


# Type hint for middleware
from typing import Any, Callable

# Create the application instance
app = create_app()
