"""
Gujarat Sentinel — Model 1
Health, Readiness and System endpoints

These endpoints are used by:
  - Kubernetes liveness probe (/health)
  - Kubernetes readiness probe (/ready)
  - Prometheus scraping (/metrics)
  - Load balancer health checks

Following the health check RFC: https://tools.ietf.org/html/draft-inadarei-api-health-check-06
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.config import get_settings
from app.core.events import check_kafka_connection
from app.db.session import check_connection as check_db
from app.schemas.camera import (
    HealthResponseSchema,
    ReadinessCheckSchema,
    ReadinessResponseSchema,
)

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["system"])

# Redis health check
async def check_redis_connection() -> bool:
    """Check Redis connectivity."""
    try:
        from app.core.cache import get_redis
        r = await get_redis()
        await r.ping()
        return True
    except Exception as e:
        logger.error("redis_health_check_failed", error=str(e))
        return False


@router.get(
    "/health",
    response_model=HealthResponseSchema,
    summary="Service liveness probe",
    description="Returns 200 if the service process is running. Does NOT check dependencies.",
)
async def health_check() -> HealthResponseSchema:
    """
    Liveness probe — always returns 200 if the service is running.

    Kubernetes uses this to determine if the container should be restarted.
    Only fails if the process itself is hung or deadlocked.
    """
    settings = get_settings()
    return HealthResponseSchema(
        status="healthy",
        service=settings.model1_service_name,
        version=settings.service_version,
        timestamp=datetime.now(tz=timezone.utc),
    )


@router.get(
    "/ready",
    response_model=ReadinessResponseSchema,
    summary="Service readiness probe",
    description="Returns 200 only if all dependencies (DB, Redis, Kafka) are reachable.",
)
async def readiness_check() -> ReadinessResponseSchema:
    """
    Readiness probe — checks all external dependencies.

    Kubernetes uses this to determine if the service should receive traffic.
    Returns 503 if any critical dependency is unavailable.
    """
    checks: dict[str, ReadinessCheckSchema] = {}

    # Check database
    db_ok = await check_db()
    checks["database"] = ReadinessCheckSchema(
        status="ok" if db_ok else "error",
        message=None if db_ok else "PostgreSQL connection failed",
    )

    # Check Redis
    redis_ok = await check_redis_connection()
    checks["redis"] = ReadinessCheckSchema(
        status="ok" if redis_ok else "error",
        message=None if redis_ok else "Redis connection failed",
    )

    # Check Kafka (non-critical — service can operate without it)
    kafka_ok = await check_kafka_connection()
    checks["kafka"] = ReadinessCheckSchema(
        status="ok" if kafka_ok else "error",
        message=None if kafka_ok else "Kafka connection failed (events will be queued)",
    )

    # Ready if database and redis are up (Kafka failure is non-fatal)
    ready = db_ok and redis_ok

    response = ReadinessResponseSchema(ready=ready, checks=checks)

    if not ready:
        logger.warning("readiness_check_failed", checks=checks)

    return response


@router.get(
    "/metrics",
    summary="Prometheus metrics",
    description="Exports Prometheus-format metrics for scraping.",
    include_in_schema=True,
)
async def prometheus_metrics(response: Response) -> bytes:
    """
    Prometheus metrics endpoint.

    Metrics include:
    - HTTP request duration histograms
    - Camera count by status/department
    - Kafka publish success/failure counters
    - Database query duration
    """
    response.headers["Content-Type"] = CONTENT_TYPE_LATEST
    return generate_latest()
