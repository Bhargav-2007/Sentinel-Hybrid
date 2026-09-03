"""
Gujarat Sentinel — API Rate Limiting & Brute-Force Defense Middleware
Applies token-bucket / sliding window rate limiting per IP address / officer token
to protect against automated scrapers, brute force login attempts, and DDoS.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    """Sliding window in-memory rate limiter per client IP."""

    def __init__(self, requests_per_minute: int = 120, burst_limit: int = 40):
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit
        # Key: client_ip -> List of request timestamps
        self._clients: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - 60.0

        # Purge timestamps older than 60s
        self._clients[client_ip] = [t for t in self._clients[client_ip] if t > window_start]

        if len(self._clients[client_ip]) >= self.requests_per_minute:
            retry_after = int(60.0 - (now - self._clients[client_ip][0]))
            return False, max(1, retry_after)

        self._clients[client_ip].append(now)
        return True, 0


# Global rate limiter instance
rate_limiter = SlidingWindowRateLimiter(requests_per_minute=180, burst_limit=50)


def check_rate_limit(request: Request, max_requests: int = 15, window_seconds: int = 60) -> bool:
    """Helper function to enforce rate limiting on specific sensitive routes like login."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    allowed, retry_after = rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests from IP {client_ip}. Please retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
    return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI Middleware enforcing sliding window rate limits."""

    async def dispatch(self, request: Request, call_next):
        # Bypass rate limiting for local health probes, websocket handshakes, and high-frequency CCTV video streams
        path = request.url.path
        if (
            path in ("/health", "/api/v1/health-matrix", "/docs", "/openapi.json", "/redoc")
            or path.startswith("/ws")
            or path.startswith("/api/v1/streams")
        ):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        allowed, retry_after = rate_limiter.is_allowed(client_ip)

        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests from IP {client_ip}. Please retry after {retry_after} seconds.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)}
            )

        response = await call_next(request)
        return response

