FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir fastapi uvicorn[standard] Pillow numpy

WORKDIR /app
COPY vms_a_hikvision.py vms_b_dahua.py ./

ENV VMS_PORT=9001
ENV VENDOR=hikvision

# Start the correct VMS based on VENDOR env var
CMD if [ "$VENDOR" = "dahua" ]; then \
        uvicorn vms_b_dahua:app --host 0.0.0.0 --port ${VMS_PORT}; \
    else \
        uvicorn vms_a_hikvision:app --host 0.0.0.0 --port ${VMS_PORT}; \
    fi

HEALTHCHECK --interval=15s --timeout=5s \
    CMD curl -f http://localhost:${VMS_PORT}/health || exit 1
