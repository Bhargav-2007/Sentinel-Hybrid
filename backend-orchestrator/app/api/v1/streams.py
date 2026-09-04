"""Live Video Ingestion & Real-Time AI Stream Delivery API."""

from __future__ import annotations

import asyncio
import io
import logging
import os
import time
from typing import Any, Dict, Generator, List, Optional

import cv2
import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse

import base64
from app.core.config import settings

# Force RTSP over TCP
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

logger = logging.getLogger("sentinel.api.streams")

router = APIRouter(prefix="/streams", tags=["Live Streams & AI Ingestion"])

DEFAULT_RTSP_HOST = settings.SENTINEL_SANDBOX_HOST
DEFAULT_RTSP_PORT = 8554

# Global YOLO model cache
_yolo_detector = None


def get_detector():
    global _yolo_detector
    if _yolo_detector is None:
        try:
            from ultralytics import YOLO
            _yolo_detector = YOLO("yolov8n.pt")
            logger.info("✓ YOLOv8n detector loaded for live stream proxy.")
        except Exception as e:
            logger.warning(f"Could not load YOLO: {e}")
            _yolo_detector = False
    return _yolo_detector if _yolo_detector is not False else None


CLASS_NAMES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}


def normalize_cam_tag(camera_id: str) -> str:
    """Normalizes camera IDs to cam01..cam30 format."""
    clean = camera_id.lower().replace("cam-", "").replace("cam", "").replace("home-live-", "")
    try:
        num = int(clean)
        return f"cam{num:02d}"
    except ValueError:
        return "cam01" if not camera_id.startswith("cam") else camera_id.lower()


@router.get("")
async def list_stream_catalogue():
    """Returns dynamic stream catalogue mapped directly to Sentinel Camera Grid."""
    streams = []
    for i in range(1, 31):
        cam_tag = f"cam{i:02d}"
        streams.append({
            "id": str(i),
            "camera_id": f"CAM-GJ-{i:02d}",
            "name": f"Gujarat CCTV Checkpoint #{i:02d} ({cam_tag.upper()})",
            "status": "ONLINE",
            "rtsp_url": f"rtsp://{DEFAULT_RTSP_HOST}:{DEFAULT_RTSP_PORT}/stream/{cam_tag}",
            "webrtc_url": f"/api/v1/streams/{cam_tag}/whep",
            "webrtc_direct_url": f"http://{DEFAULT_RTSP_HOST}:8889/stream/{cam_tag}/whep",
            "hls_url": settings.get_hls_url(cam_tag),
            "live_feed_url": f"/api/v1/streams/{cam_tag}/live-feed",
            "snapshot_url": f"/api/v1/streams/{cam_tag}/snapshot",
            "codec": "h264" if i % 4 != 0 else "h265",
            "resolution": "1920x1080",
            "fps": 25.0,
        })
    return {"total": len(streams), "streams": streams}


def generate_live_stream_frames(cam_tag: str):
    """
    Connects to real RTSP stream, runs YOLO detection, overlays bounding boxes,
    and yields multipart MJPEG stream with monotonic PTS.
    """
    rtsp_url = settings.get_authenticated_rtsp_url(cam_tag)
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    
    if not cap.isOpened():
        logger.warning(f"RTSP stream {cam_tag} could not be opened at {DEFAULT_RTSP_HOST}:{DEFAULT_RTSP_PORT}")
        return

    detector = get_detector()
    frame_count = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                # Reconnect with backoff
                cap.release()
                time.sleep(1.0)
                cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
                continue

            frame_count += 1
            pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
            h, w, _ = frame.shape

            # Run YOLO detection every 2nd frame for optimal throughput
            detections = []
            if detector and frame_count % 2 == 0:
                try:
                    results = detector(frame, verbose=False, conf=0.35, classes=[0, 1, 2, 3, 5, 7])
                    for r in results:
                        for box in r.boxes:
                            cls_id = int(box.cls[0].item())
                            conf = float(box.conf[0].item())
                            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                            cls_name = CLASS_NAMES.get(cls_id, "vehicle")

                            # Sub-classify auto-rickshaw vs car vs scooter
                            box_w = x2 - x1
                            box_h = y2 - y1
                            aspect = box_h / max(1, box_w)
                            if cls_name == "car" and 0.8 < aspect < 1.3:
                                cls_name = "auto-rickshaw"
                            elif cls_name == "motorcycle" and aspect > 1.2:
                                cls_name = "scooter"

                            detections.append({
                                "class": cls_name,
                                "conf": conf,
                                "box": (x1, y1, x2, y2)
                            })
                except Exception:
                    pass

            # Draw HUD Overlays onto frame
            for det in detections:
                x1, y1, x2, y2 = det["box"]
                cls_name = det["class"]
                conf = det["conf"]

                color = (0, 255, 120) if cls_name in ("car", "auto-rickshaw", "bus", "truck") else (255, 200, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # Label Header with actual detected class and confidence
                label = f"{cls_name.upper()} {conf:.0%}"
                (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(frame, (x1, max(0, y1 - 20)), (x1 + lw + 6, max(0, y1)), color, -1)
                cv2.putText(
                    frame, label, (x1 + 3, max(14, y1 - 5)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA
                )

            # Draw Global HUD Header & Authoritative PTS
            cv2.rectangle(frame, (10, 10), (340, 48), (10, 15, 25), -1)
            cv2.rectangle(frame, (10, 10), (340, 48), (0, 240, 255), 1)
            cv2.putText(
                frame, f"GUJARAT POLICE SENTINEL - {cam_tag.upper()}", (18, 26),
                cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 255), 1, cv2.LINE_AA
            )
            cv2.putText(
                frame, f"MEDIA PTS: {pts_ms:.1f}ms | HOST: {DEFAULT_RTSP_HOST}", (18, 42),
                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 153), 1, cv2.LINE_AA
            )

            # Resize to 720p for fast web streaming if higher resolution
            if w > 1280:
                frame = cv2.resize(frame, (1280, 720))

            # Encode as JPEG
            success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not success:
                continue

            jpg_bytes = buffer.tobytes()
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + jpg_bytes + b"\r\n")

            time.sleep(0.035)  # ~25 FPS pacing

    finally:
        cap.release()


@router.get("/{camera_id}/live-feed")
async def get_camera_live_feed(camera_id: str):
    """
    Streams the live real CCTV feed with bounding boxes and HUD drawn directly on frames.
    Works natively in all web browsers without plugins.
    """
    cam_tag = normalize_cam_tag(camera_id)
    return StreamingResponse(
        generate_live_stream_frames(cam_tag),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: str):
    """Returns a single live JPEG snapshot from the physical camera feed with real PTS and detection overlay."""
    cam_tag = normalize_cam_tag(camera_id)
    rtsp_url = settings.get_authenticated_rtsp_url(cam_tag)
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    
    if not cap.isOpened():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Camera stream {cam_tag} offline or unreachable on {DEFAULT_RTSP_HOST}:{DEFAULT_RTSP_PORT}"
        )

    ret, frame = cap.read()
    pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
    cap.release()

    if not ret or frame is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Frame decode failure for {cam_tag}"
        )

    # Annotate frame with real YOLO detection if available
    detector = get_detector()
    if detector:
        try:
            results = detector(frame, verbose=False, conf=0.35, classes=[0, 1, 2, 3, 5, 7])
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    cls_name = CLASS_NAMES.get(cls_id, "vehicle")
                    color = (0, 255, 120) if cls_name in ("car", "auto-rickshaw", "bus", "truck") else (255, 200, 0)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    label = f"{cls_name.upper()} {conf:.0%}"
                    (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    cv2.rectangle(frame, (x1, max(0, y1 - 20)), (x1 + lw + 6, max(0, y1)), color, -1)
                    cv2.putText(frame, label, (x1 + 3, max(14, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
        except Exception:
            pass

    # Header with PTS
    cv2.rectangle(frame, (10, 10), (320, 42), (10, 15, 25), -1)
    cv2.putText(frame, f"SENTINEL {cam_tag.upper()} | PTS: {pts_ms:.1f}ms", (18, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 255), 1)

    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode JPEG snapshot")

    return Response(
        content=buffer.tobytes(),
        media_type="image/jpeg",
        headers={
            "X-Sentinel-PTS-MS": str(round(pts_ms, 2)),
            "X-Sentinel-Camera": cam_tag,
            "Cache-Control": "no-store, no-cache, must-revalidate"
        }
    )


@router.options("/{camera_id}/whep")
async def whep_options(camera_id: str):
    """WHEP discovery options for WebRTC player."""
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Expose-Headers": "Location",
        }
    )


@router.post("/{camera_id}/whep")
async def whep_proxy(camera_id: str, request: Request):
    """
    Proxies WebRTC WHEP SDP offer from browser to MediaMTX with server-side authentication.
    Credentials remain strictly on server side and are never exposed to the client.
    """
    cam_tag = normalize_cam_tag(camera_id)
    target_url = f"http://{DEFAULT_RTSP_HOST}:8889/stream/{cam_tag}/whep"

    sdp_body = await request.body()
    headers = {"Content-Type": "application/sdp"}

    if settings.SENTINEL_STREAM_USER and settings.SENTINEL_STREAM_PASSWORD:
        creds = f"{settings.SENTINEL_STREAM_USER}:{settings.SENTINEL_STREAM_PASSWORD}".encode("utf-8")
        headers["Authorization"] = f"Basic {base64.b64encode(creds).decode('ascii')}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(target_url, content=sdp_body, headers=headers)
            res_headers = {
                "Content-Type": "application/sdp",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Location",
            }
            if "Location" in resp.headers:
                res_headers["Location"] = resp.headers["Location"]

            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=res_headers
            )
        except Exception as e:
            logger.error(f"WHEP proxy error to {target_url}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"WHEP gateway connection failed for {cam_tag}"
            )
