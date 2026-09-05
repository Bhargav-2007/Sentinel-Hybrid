"""
Gujarat Sentinel — Python Fallback Gateway (:8000)

Provides a transparent HTTP reverse proxy on port 8000 when the Go toolchain
is not installed on Windows, routing requests to Model 1 (:8001), Model 2 (:8002),
and Orchestrator (:8005).
"""

import os
import sys
import logging
from typing import Optional
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [FallbackGateway] %(message)s"
)
logger = logging.getLogger("sentinel.gateway.fallback")

PORT = int(os.getenv("GATEWAY_PORT", "8000"))
MODEL1_URL = os.getenv("MODEL1_URL", "http://127.0.0.1:8001")
MODEL2_URL = os.getenv("MODEL2_URL", "http://127.0.0.1:8002")
MODEL3_URL = os.getenv("MODEL3_URL", "http://127.0.0.1:8003")
MODEL4_URL = os.getenv("MODEL4_URL", "http://127.0.0.1:8004")
ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://127.0.0.1:8005")

app = FastAPI(
    title="Gujarat Sentinel — Hybrid Gateway (Python Fallback)",
    description="Reverse proxy fallback for environments lacking Go toolchain",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client: Optional[httpx.AsyncClient] = None


@app.on_event("startup")
async def startup():
    global client
    client = httpx.AsyncClient(timeout=30.0)
    logger.info(f"Fallback Gateway listening on port {PORT}")
    logger.info(f"  Model 1 (GIS/Registry):     {MODEL1_URL}")
    logger.info(f"  Model 2 (Unified/ANPR):     {MODEL2_URL}")
    logger.info(f"  Orchestrator:               {ORCHESTRATOR_URL}")


@app.on_event("shutdown")
async def shutdown():
    global client
    if client:
        await client.aclose()


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "sentinel-hybrid-gateway-python",
        "version": "1.0.0",
        "mode": "python-fallback-proxy"
    }


@app.get("/ready")
async def ready():
    checks = {}
    models = {
        "model1": f"{MODEL1_URL}/health",
        "model2": f"{MODEL2_URL}/health",
        "orchestrator": f"{ORCHESTRATOR_URL}/health",
    }
    all_ok = True
    for name, health_url in models.items():
        try:
            assert client is not None
            resp = await client.get(health_url, timeout=3.0)
            if resp.status_code == 200:
                checks[name] = "ok"
            else:
                checks[name] = f"http_{resp.status_code}"
                all_ok = False
        except Exception as e:
            checks[name] = "offline"
            all_ok = False

    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={"ready": all_ok, "models": checks}
    )


def resolve_backend(path: str) -> str:
    """Routes an incoming path to the appropriate backend service."""
    # Model 1 endpoints
    if path.startswith("/api/v1/gis") or path.startswith("/api/v1/departments"):
        return MODEL1_URL

    # Model 2 endpoints
    if (
        path.startswith("/api/v1/anpr")
        or path.startswith("/api/v1/watchlist")
        or path.startswith("/api/v1/events")
    ):
        return MODEL2_URL

    # All other /api/v1 endpoints (cameras, streams, alerts, cases, tracking, auth, evidence, etc.)
    # default to Orchestrator (:8005)
    return ORCHESTRATOR_URL


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
async def reverse_proxy(request: Request, path: str):
    """Transparently proxies all requests to the matching target service."""
    assert client is not None
    target_backend = resolve_backend(request.url.path)
    target_url = f"{target_backend}{request.url.path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)

    body = await request.body()

    try:
        req = client.build_request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body
        )
        resp = await client.send(req, stream=True)

        excluded_headers = {"content-encoding", "content-length", "transfer-encoding", "connection"}
        response_headers = {
            k: v for k, v in resp.headers.items()
            if k.lower() not in excluded_headers
        }

        return StreamingResponse(
            resp.aiter_raw(),
            status_code=resp.status_code,
            headers=response_headers,
            background=resp.aclose
        )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=502,
            content={
                "error": "Bad Gateway",
                "message": f"Target service at {target_backend} is currently offline or unreachable.",
                "target_url": target_url
            }
        )
    except Exception as e:
        logger.error(f"Proxy error for {target_url}: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Proxy Error", "detail": str(e)}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
