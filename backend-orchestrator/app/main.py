"""Gujarat Sentinel — Unified Platform Backend & Central Brain Application Factory."""

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

    # 3. Auto-onboard 50 Sentinel cameras
    try:
        async with AsyncSessionLocal() as session:
            await camera_service.onboard_50_sentinel_cameras(session)
    except Exception as e:
        logger.warning(f"Camera auto-onboarding notice: {e}")

    logger.info("✨ Gujarat Sentinel Platform Backend is READY and listening.")
    yield

    # Cleanup on shutdown
    logger.info("Shutting down Sentinel Orchestrator services...")
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/", tags=["Health & Status"])
async def root():
    """Platform identity and system descriptor."""
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "OPERATIONAL",
        "jurisdiction": "Gujarat Police & 26 State Departments",
        "documentation": "/docs",
        "api_v1_base": "/api/v1",
        "models_integrated": ["Model 1 (GIS :8001)", "Model 2 (ANPR :8002)", "Model 3 (VMS :8003)", "Model 4 (Trajectory :8004)"],
    }


@app.get("/health", tags=["Health & Status"])
async def health_check():
    """Health check endpoint for Docker container orchestrators and load balancers."""
    db_ok = await check_db_health()
    redis_ok = await redis_manager.is_healthy()

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
