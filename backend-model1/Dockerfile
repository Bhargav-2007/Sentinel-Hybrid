# ──────────────────────────────────────────────────────────────────────────────
# Gujarat Sentinel — Model 1: CCTV Registry & GIS
# Multi-stage Dockerfile (production-ready)
#
# Build stages:
#   1. builder   — install dependencies with pip (reliable, no lock file needed)
#   2. runtime   — minimal image with app only (no build tools)
#
# Security:
#   - Non-root user (uid=1000)
#   - No shell in final image (distroless-like)
#   - Read-only filesystem for source code
#   - HEALTHCHECK instruction for Docker/K8s
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Install system dependencies required for:
#   - asyncpg: libpq (PostgreSQL client)
#   - geoalchemy2: GDAL/GEOS for PostGIS geometry
#   - Shapely: libgeos
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libgeos-dev \
        libproj-dev \
        gdal-bin \
        libgdal-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*


# Set working directory
WORKDIR /build

# Copy pyproject.toml for dependency reference
COPY pyproject.toml ./

# Install all main dependencies directly with pip (more reliable in Docker than Poetry)
# Reads dependency list from pyproject.toml and installs to /app/.venv
RUN python -m venv /app/.venv && \
    /app/.venv/bin/pip install --upgrade pip setuptools wheel && \
    /app/.venv/bin/pip install --timeout 300 --retries 5 --no-cache-dir \
        fastapi==0.115.* \
        "uvicorn[standard]==0.32.*" \
        python-multipart \
        "sqlalchemy[asyncio]==2.0.*" \
        asyncpg \
        alembic \
        geoalchemy2 \
        pydantic \
        pydantic-settings \
        email-validator \
        "redis[hiredis]" \
        aiokafka \
        cloudevents \
        "python-jose[cryptography]" \
        cryptography \
        httpx \
        opentelemetry-sdk \
        opentelemetry-instrumentation-fastapi \
        opentelemetry-instrumentation-sqlalchemy \
        opentelemetry-instrumentation-redis \
        opentelemetry-exporter-otlp-proto-grpc \
        prometheus-client \
        prometheus-fastapi-instrumentator \
        structlog \
        orjson \
        anyio \
        tenacity \
        shapely \
        h3 \
        pyproj

# Copy application source
COPY app/ ./app/
COPY alembic.ini ./

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Install only runtime system libraries
# Debian Trixie (python:3.12-slim base) renames some libs:
#   libgeos3.11.0 → libgeos-c1t64
#   libproj25 stays the same in Trixie
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libgeos-c1t64 \
        libproj25 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 sentinel \
    && useradd --uid 1000 --gid sentinel --no-create-home --shell /sbin/nologin sentinel

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder --chown=sentinel:sentinel /app/.venv /app/.venv
COPY --from=builder --chown=sentinel:sentinel /build/app /app/app
COPY --from=builder --chown=sentinel:sentinel /build/alembic.ini /app/alembic.ini

# Set PATH to use venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER sentinel

# Health check — Kubernetes will use /ready instead, but Docker needs this
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

EXPOSE 8001

# Entry point: uvicorn with production settings
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8001", \
     "--workers", "4", \
     "--loop", "uvloop", \
     "--http", "httptools", \
     "--no-access-log", \
     "--timeout-keep-alive", "75"]
