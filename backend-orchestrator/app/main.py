"""Gujarat Sentinel — Unified Platform Backend & Central Brain Application Factory."""

import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app, Counter, Histogram

from app.core.config import settings
from app.core.database import init_db, check_db_health, AsyncSessionLocal
from app.core.redis_client import redis_manager
from app.api.v1 import api_router
from app.services.camera_service import camera_service

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sentinel.main")

# Prometheus Metrics
REQUEST_COUNT = Counter("sentinel_orchestrator_requests_total", "Total requests", ["method", "endpoint", "status"])
REQUEST_LATENCY = Histogram("sentinel_orchestrator_latency_seconds", "Request latency", ["endpoint"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database initialization and service startup."""
    logger.info("=================================================================")
    logger.info("🛡️  GUJARAT SENTINEL — UNIFIED PLATFORM BACKEND & ORCHESTRATOR")
    logger.info(f"   Version: {settings.VERSION} | Mode: {settings.ENVIRONMENT.upper()}")
    logger.info("=================================================================")

    # 1. Initialize Database & PostGIS
    try:
        await init_db()
        logger.info("✓ Database schema verified.")
    except Exception as e:
        logger.error(f"Database initialization warning: {e}")

    # 2. Connect to Redis
    await redis_manager.connect()

    # 3. Dynamic Catalogue Ingestion & Sync (no hardcoded cameras)
    live_catalogue = []
    try:
        async with AsyncSessionLocal() as session:
            live_catalogue = await camera_service.discover_and_sync_catalogue(session)
            logger.info(f"✓ Dynamic catalogue synchronized: {len(live_catalogue)} streams discovered.")
    except Exception as e:
        logger.warning(f"Dynamic catalogue sync notice: {e}")

    # 4. Start Stream Supervisor using dynamically discovered catalogue
    try:
        from app.services.stream_supervisor import stream_supervisor, CameraPriority

        logger.info("Starting Stream Supervisor for dynamic CCTV fleet...")
        for cam_entry in live_catalogue:
            cam_id = str(cam_entry.get("stream_id") or cam_entry.get("id", "1")).replace("stream/", "")
            cam_tag = f"cam{int(cam_id):02d}" if cam_id.isdigit() else cam_id
            rtsp_url = settings.get_authenticated_rtsp_url(cam_tag)
            stream_supervisor.register_camera(
                camera_id=cam_tag,
                rtsp_url=rtsp_url,
                target_ai_fps=2.0,
                priority=CameraPriority.NORMAL,
            )

        ai_pool_size = int(os.environ.get("SENTINEL_AI_POOL_SIZE", "1"))
        active_cams = int(os.environ.get("SENTINEL_ACTIVE_CAMERAS", "2"))
        stream_supervisor.start_all(pool_size=ai_pool_size, initial_active_count=active_cams)
        logger.info(
            f"✓ Stream Supervisor started: {len(live_catalogue)} cameras registered dynamically, "
            f"active={active_cams}, AI pool size={ai_pool_size}."
        )
    except Exception as sup_err:
        logger.error(f"Stream Supervisor startup failed: {sup_err}", exc_info=True)

    logger.info("✨ Gujarat Sentinel Platform Backend is READY and listening.")
    yield

    # Cleanup on shutdown
    logger.info("Shutting down Sentinel Orchestrator services...")
    try:
        from app.services.stream_supervisor import stream_supervisor
        stream_supervisor.stop_all()
        logger.info("Stream Supervisor stopped.")
    except Exception:
        pass
    await redis_manager.disconnect()


# FastAPI Application Instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Central Brain and Unified AI Orchestration Backend for the Gujarat Police Innovation Challenge 2026. "
        "Consumes the 4 existing external AI microservices via REST API calls, manages 50+ camera feeds, "
        "enforces Officer Badge authentication, and broadcasts real-time APB threat intelligence."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

from app.core.rate_limiter import RateLimitMiddleware

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)


@app.middleware("http")
async def add_process_time_and_metrics(request: Request, call_next):
    """Middleware measuring request latency and recording Prometheus metrics."""
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000.0
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    response.headers["X-Platform"] = "Gujarat-Sentinel-Hybrid"
    
    # Record Prometheus metrics
    try:
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        REQUEST_LATENCY.labels(endpoint=request.url.path).observe(process_time / 1000.0)
    except Exception:
        pass
        
    return response


# Include API v1 Router
app.include_router(api_router)

# Mount Prometheus Metrics ASGI
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/soc", response_class=JSONResponse, include_in_schema=False)
@app.get("/dashboard", include_in_schema=False)
async def serve_soc_dashboard():
    """Serves the Unified Gujarat Police Cyber Command & SOC Live Matrix Dashboard."""
    from fastapi.responses import HTMLResponse
    from pathlib import Path
    dashboard_path = Path(__file__).resolve().parent.parent.parent / "backend-hybrid" / "cmd" / "gateway" / "index.html"
    if dashboard_path.exists():
        with open(dashboard_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    return HTMLResponse("<h2>Gujarat Sentinel SOC Dashboard loading...</h2>")


@app.get("/api/ingest", tags=["Catalogue Ingestion"], summary="Sentinel-Compatible /api/ingest Discovery Endpoint")
async def get_ingest_catalogue():
    """
    Official Sentinel Sandbox /api/ingest endpoint.
    Returns the dynamic camera catalogue with RTSP, WHEP, and HLS endpoints, codecs, and stream properties.
    The catalogue is the contract.
    """
    async with AsyncSessionLocal() as session:
        return await camera_service.get_ingest_catalogue(session)


@app.get("/api/ingest/{stream_id}", tags=["Catalogue Ingestion"], summary="Get Stream Details by ID")
async def get_stream_details(stream_id: str):
    """Returns details for a specific stream from the dynamic catalogue."""
    async with AsyncSessionLocal() as session:
        catalogue = await camera_service.get_ingest_catalogue(session)
        for cam in catalogue:
            if (
                str(cam.get("stream_id")) == stream_id
                or cam.get("id") == f"stream/{stream_id}"
                or cam.get("camera_id") == stream_id
            ):
                return cam
        return JSONResponse(status_code=404, content={"error": f"Stream {stream_id} not found in catalogue"})


@app.get("/", tags=["Health & Status"])
async def root():
    """Platform identity and system descriptor."""
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "OPERATIONAL",
        "jurisdiction": "Gujarat Police & 26 State Departments",
        "soc_dashboard_url": "/dashboard",
        "documentation": "/docs",
        "api_v1_base": "/api/v1",
        "models_integrated": ["Model 1 (GIS :8001)", "Model 2 (ANPR :8002)", "Model 3 (VMS :8003)", "Model 4 (Trajectory :8004)"],
    }


@app.get("/health", tags=["Health & Status"])
async def health_check():
    """Health check endpoint for Docker container orchestrators and load balancers."""
    import asyncio
    try:
        db_ok = await asyncio.wait_for(check_db_health(), timeout=1.0)
    except Exception:
        db_ok = False
    try:
        redis_ok = await asyncio.wait_for(redis_manager.is_healthy(), timeout=0.5)
    except Exception:
        redis_ok = False

    overall_status = "healthy" if db_ok else "degraded"
    return {
        "status": overall_status,
        "service": "sentinel-orchestrator",
        "version": settings.VERSION,
        "components": {
            "database": "ONLINE" if db_ok else "OFFLINE",
            "redis_pubsub": "ONLINE" if redis_ok else "OFFLINE",
        }
    }
