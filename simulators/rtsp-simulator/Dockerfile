FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        fonts-dejavu \
        wget \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && (apt-get update && apt-get install -y --no-install-recommends mediamtx && rm -rf /var/lib/apt/lists/* \
        || (wget -q https://github.com/bluenviron/mediamtx/releases/download/v1.9.2/mediamtx_v1.9.2_linux_amd64.tar.gz \
            -O /tmp/mediamtx.tar.gz \
            && tar -xzf /tmp/mediamtx.tar.gz -C /usr/local/bin \
            && rm /tmp/mediamtx.tar.gz \
            && echo "MediaMTX installed from GitHub releases"))

WORKDIR /app

# Copy MediaMTX config
COPY mediamtx.yml /etc/mediamtx/mediamtx.yml
COPY mediamtx.yml /app/mediamtx.yml

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    Pillow \
    numpy \
    aiofiles

COPY simulator.py .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8554 8889 8888

CMD ["/app/entrypoint.sh"]
