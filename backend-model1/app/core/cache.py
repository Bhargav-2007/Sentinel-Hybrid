"""
Gujarat Sentinel — Model 1
Redis Cache Client

Used for:
  - Camera status caching (TTL: 30s) — avoids DB hit on every health check
  - JWKS caching (TTL: 1h) — avoids OIDC hit on every request
  - Rate limiting counters
  - Session data
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from redis.asyncio import Redis, from_url

from app.config import get_settings

logger = structlog.get_logger(__name__)

_redis: Redis | None = None


async def get_redis() -> Redis:
    """Return singleton Redis client."""
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
        )
        # Test connection
        try:
            await _redis.ping()
            logger.info("redis_connected", url=settings.redis_url.split("@")[-1])
        except Exception as e:
            logger.error("redis_connection_failed", error=str(e))
    return _redis


async def close_redis() -> None:
    """Close Redis connection pool."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        logger.info("redis_closed")


class CameraStatusCache:
    """Cache wrapper for camera live status."""

    KEY_PREFIX = "sentinel:model1:camera_status:"
    TTL = 30  # seconds

    def __init__(self, redis: Redis):
        self.redis = redis

    async def get(self, camera_id: str) -> dict[str, Any] | None:
        """Get cached camera status."""
        key = f"{self.KEY_PREFIX}{camera_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def set(self, camera_id: str, status: dict[str, Any]) -> None:
        """Cache camera status with TTL."""
        key = f"{self.KEY_PREFIX}{camera_id}"
        await self.redis.setex(key, self.TTL, json.dumps(status, default=str))

    async def invalidate(self, camera_id: str) -> None:
        """Remove cached status for a camera."""
        key = f"{self.KEY_PREFIX}{camera_id}"
        await self.redis.delete(key)

    async def get_all_statuses(self) -> dict[str, dict[str, Any]]:
        """Get all cached camera statuses (for dashboard)."""
        pattern = f"{self.KEY_PREFIX}*"
        keys = await self.redis.keys(pattern)
        if not keys:
            return {}

        values = await self.redis.mget(*keys)
        result = {}
        for key, value in zip(keys, values):
            if value:
                camera_id = key.replace(self.KEY_PREFIX, "")
                result[camera_id] = json.loads(value)
        return result
