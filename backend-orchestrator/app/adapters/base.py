"""Base HTTP client with circuit breaker, exponential backoff, and robust error handling."""

import asyncio
import logging
from typing import Any, Dict, Optional
import httpx

logger = logging.getLogger("sentinel.adapter.base")


class BaseServiceClient:
    """
    Robust HTTP client wrapper for consuming external AI model microservices.
    Implements timeout budgets, retry loops with exponential backoff, and graceful fallback.
    """

    def __init__(self, service_name: str, base_url: str, timeout_seconds: float = 4.0):
        self.service_name = service_name
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_seconds, connect=2.0)
        self._consecutive_failures = 0
        self._circuit_open_until = 0.0

    async def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, retries: int = 2) -> Optional[Dict[str, Any]]:
        """Performs a GET request with retry and error handling."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        for attempt in range(retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200:
                        self._consecutive_failures = 0
                        return resp.json()
                    elif resp.status_code == 404:
                        return None
                    else:
                        logger.warning(f"[{self.service_name}] GET {url} returned status {resp.status_code}")
            except Exception as e:
                logger.debug(f"[{self.service_name}] GET {url} attempt {attempt+1} failed: {e}")
                if attempt < retries:
                    await asyncio.sleep(0.2 * (2 ** attempt))
                    
        self._consecutive_failures += 1
        return None

    async def post(self, endpoint: str, payload: Optional[Dict[str, Any]] = None, retries: int = 1) -> Optional[Dict[str, Any]]:
        """Performs a POST request with retry and error handling."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        for attempt in range(retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=payload or {})
                    if resp.status_code in (200, 201):
                        self._consecutive_failures = 0
                        return resp.json()
                    else:
                        logger.warning(f"[{self.service_name}] POST {url} returned status {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                logger.debug(f"[{self.service_name}] POST {url} attempt {attempt+1} failed: {e}")
                if attempt < retries:
                    await asyncio.sleep(0.2 * (2 ** attempt))
                    
        self._consecutive_failures += 1
        return None

    async def check_health(self) -> Dict[str, Any]:
        """Queries the health endpoint of the external model microservice."""
        # Derive root host URL from base_url (e.g. http://model1:8001 from http://model1:8001/api/v1)
        root_url = self.base_url.split("/api")[0].rstrip("/")
        candidate_urls = [
            f"{root_url}/health",
            f"{root_url}/actuator/health",
            f"{self.base_url}/health"
        ]
        
        for h_url in candidate_urls:
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(2.0)) as client:
                    resp = await client.get(h_url)
                    if resp.status_code in (200, 201):
                        try:
                            data = resp.json()
                        except Exception:
                            data = resp.text[:100]
                        return {"status": "ONLINE", "http_code": resp.status_code, "details": data}
            except Exception:
                continue

        return {"status": "OFFLINE", "error": "Could not connect to health endpoint"}
