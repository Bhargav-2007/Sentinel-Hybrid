# =============================================================================
# Gujarat Sentinel — Real-Time AI Detection & ANPR Engine
# Production Dockerfile (CPU & GPU Optimized)
# =============================================================================

FROM python:3.11-slim

WORKDIR /app

# Install system libraries for OpenCV, video decoding, and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download default YOLO weights
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" || true

# Copy codebase
COPY app/ ./app/
COPY models/ ./models/
COPY scripts/ ./scripts/

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8006

EXPOSE 8006

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8006/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006", "--workers", "2"]
