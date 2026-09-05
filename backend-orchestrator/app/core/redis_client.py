"""Async Redis client and Pub/Sub broadcaster for horizontal scaling and real-time streaming."""

import json
import logging
from typing import Any, Dict, Optional, Callable
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("sentinel.redis")


class RedisManager:
    """Manages Redis connection pool, Pub/Sub channels, and caching for statewide horizontal scaling."""
    
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None
        self._pubsub: Optional[aioredis.client.PubSub] = None
        self._fallback_cache: Dict[str, Any] = {}
        self._subscribers: Dict[str, list] = {}

    async def connect(self) -> None:
        """Establishes connection to Redis."""
        import os
        redis_url = settings.REDIS_URL
        is_docker = os.path.exists("/.dockerenv") or "redis://redis:" in os.environ.get("REDIS_URL", "")
        if not is_docker and ("@redis:" in redis_url or "redis://redis:" in redis_url):
            redis_url = redis_url.replace("redis://redis:", "redis://127.0.0.1:")
            
        try:
            self._client = aioredis.from_url(
                redis_url,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
            await self._client.ping()
            logger.info("Connected to Redis server successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis ({e}). Operating in in-memory fallback mode.")
            self._client = None

    async def disconnect(self) -> None:
        """Closes Redis connections."""
        if self._client:
            await self._client.close()
            self._client = None
            logger.info("Redis connection closed.")

    async def is_healthy(self) -> bool:
        """Checks if Redis is reachable."""
        if not self._client:
            return False
        try:
            return bool(await self._client.ping())
        except Exception:
            return False

    async def publish(self, channel: str, message: Dict[str, Any]) -> int:
        """Publishes a real-time event to a Redis channel (e.g. alerts, detections, telemetry)."""
        payload = json.dumps(message)
        if self._client:
            try:
                return await self._client.publish(channel, payload)
            except Exception as e:
                logger.error(f"Failed to publish to Redis channel {channel}: {e}")
        
        # In-memory subscriber dispatch fallback
        if channel in self._subscribers:
            for cb in self._subscribers[channel]:
                try:
                    cb(message)
                except Exception:
                    pass
        return 1

    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieves and deserializes JSON from cache."""
        if self._client:
            try:
                val = await self._client.get(key)
                if val:
                    return json.loads(val)
                return None
            except Exception as e:
                logger.error(f"Redis get error for key {key}: {e}")
        
        return self._fallback_cache.get(key)

    async def set_json(self, key: str, value: Dict[str, Any], ttl_seconds: int = 300) -> bool:
        """Serializes and caches JSON with TTL."""
        if self._client:
            try:
                await self._client.set(key, json.dumps(value), ex=ttl_seconds)
                return True
            except Exception as e:
                logger.error(f"Redis set error for key {key}: {e}")
                
        self._fallback_cache[key] = value
        return True


# Global Redis manager singleton
redis_manager = RedisManager()
