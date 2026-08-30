#!/usr/bin/env bash
# ==============================================================================
# Sentinel Camera Grid — GStreamer Production Pipeline Reference
# ==============================================================================
# Rule 1: Always force protocols=tcp
# Rule 2: Depayload according to stream codec (H.264 or H.265) discovered from /api/ingest
# ==============================================================================

HOST="${1:-live.corp8.cloud}"
STREAM_ID="${2:-1}"
CODEC="${3:-h264}" # h264 or h265

RTSP_URI="rtsp://${HOST}:8554/stream/${STREAM_ID}"

echo "Connecting to Sentinel Grid Camera #${STREAM_ID} over TCP (${CODEC})..."
echo "URI: ${RTSP_URI}"

if [ "$CODEC" = "h265" ] || [ "$CODEC" = "hevc" ]; then
  # H.265 / HEVC Pipeline
  gst-launch-1.0 -v \
    rtspsrc location="${RTSP_URI}" protocols=tcp latency=200 \
    ! rtph265depay \
    ! h265parse \
    ! avdec_h265 \
    ! videoconvert \
    ! autovideosink sync=false
else
  # H.264 Pipeline
  gst-launch-1.0 -v \
    rtspsrc location="${RTSP_URI}" protocols=tcp latency=200 \
    ! rtph264depay \
    ! h264parse \
    ! avdec_h264 \
    ! videoconvert \
    ! autovideosink sync=false
fi
