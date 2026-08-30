# ──────────────────────────────────────────────────────────────────────────────
# Gujarat Sentinel — Model 2: Unified Viewing & ANPR Analytics
# Multi-stage Dockerfile (CPU-only inference)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# System deps for OpenCV, PyAV (FFmpeg), PaddlePaddle
# NOTE: libgl1-mesa-glx was removed in Debian Trixie; use libgl1 instead.
#       libsm6, libxrender1 keep their original names in Trixie.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libffi-dev \
        ffmpeg \
        libavcodec-dev \
        libavformat-dev \
        libavutil-dev \
        libswscale-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Install dependencies into /install prefix with CPU torch index
RUN pip install --no-cache-dir --prefix=/install --timeout 300 --retries 5 \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch torchvision \
    fastapi \
    "uvicorn[standard]" \
    "sqlalchemy[asyncio]" \
    asyncpg \
    alembic \
    "redis[hiredis]" \
    aiokafka \
    "opensearch-py[async]" \
    opencv-python-headless \
    numpy \
    Pillow \
    av \
    httpx \
    structlog \
    opentelemetry-api \
    opentelemetry-sdk \
    prometheus-client \
    prometheus-fastapi-instrumentator \
    "python-jose[cryptography]" \
    pydantic \
    pydantic-settings \
    boto3 \
    ultralytics

# Download YOLOv8n model weights at build time
RUN PYTHONPATH=/install/lib/python3.12/site-packages PATH=/install/bin:$PATH \
    python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" 2>/dev/null || true


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Trixie-compatible OpenGL/media runtime libs
# Only libgl1-mesa-glx was renamed (to libgl1); others keep original names.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

WORKDIR /app

COPY app/ ./app/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8002", \
     "--workers", "1", "--log-level", "info"]
