"""
Gujarat Sentinel — Model 2
Health & Readiness Endpoints
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.session import check_db

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
async def health():
    return {
        "status": "healthy",
        "service": "sentinel-model2",
        "version": get_settings().service_version,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }


@router.get("/ready", summary="Readiness probe")
async def readiness():
    checks = {}

    # Database
    db_ok = await check_db()
    checks["database"] = {"status": "ok" if db_ok else "error"}

    # Redis
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(get_settings().redis_url, socket_timeout=2)
        await r.ping()
        checks["redis"] = {"status": "ok"}
        await r.aclose()
    except Exception as e:
        checks["redis"] = {"status": "error", "message": str(e)[:100]}

    # OpenSearch
    try:
        from opensearchpy import AsyncOpenSearch
        client = AsyncOpenSearch(hosts=[get_settings().opensearch_url], use_ssl=False)
        info = await client.info()
        checks["opensearch"] = {"status": "ok", "version": info.get("version", {}).get("number")}
        await client.close()
    except Exception as e:
        checks["opensearch"] = {"status": "error", "message": str(e)[:100]}

    all_ok = all(c["status"] == "ok" for c in checks.values())

    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "ready": all_ok,
            "checks": checks,
            "service": "sentinel-model2",
        },
    )
