"""Cybersecurity rate limiter middleware and sliding window enforcement."""

import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from app.core.config import settings

# In-memory sliding window store: { "client_id:route": [(timestamp)] }
_rate_limit_records: Dict[str, list] = {}


def check_rate_limit(request: Request, max_requests: int = 60, window_seconds: int = 60) -> bool:
    """
    Enforces sliding-window rate limit based on client IP or authenticated officer token.
    Raises HTTP 429 if the request threshold is exceeded.
    """
    now = time.time()
    
    # Identify client by IP and optional authorization header prefix
    client_ip = request.client.host if request.client else "unknown_client"
    auth_header = request.headers.get("Authorization", "")
    client_key = f"{client_ip}:{auth_header[:16]}:{request.url.path}"
    
    timestamps = _rate_limit_records.setdefault(client_key, [])
    
    # Evict timestamps older than the sliding window
    cutoff = now - window_seconds
    valid_timestamps = [ts for ts in timestamps if ts > cutoff]
    
    if len(valid_timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_requests} requests allowed per {window_seconds} seconds.",
            headers={"Retry-After": str(window_seconds)}
        )
        
    valid_timestamps.append(now)
    _rate_limit_records[client_key] = valid_timestamps
    return True
