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
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

import base64
from app.core.config import settings
from app.core.database import get_db
from app.services.camera_service import camera_service

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


def get_stream_tag_for_camera(cam) -> str:
    """Derives stream tag (e.g. cam01) from authoritative camera record."""
    sid = getattr(cam, "stream_id", None) or getattr(cam, "id", "1")
    return normalize_cam_tag(str(sid))


@router.get("")
async def list_stream_catalogue(db: AsyncSession = Depends(get_db)):
    """
    Returns stream catalogue mapped directly to the authoritative Camera Registry in the database.
    Zero synthetic metadata: camera properties, codec, resolution, and FPS reflect actual database records.
    """
    cameras = await camera_service.get_all_cameras(db, limit=100)
    streams = []
    for cam in cameras:
        cam_tag = get_stream_tag_for_camera(cam)
        cam_status = cam.status.value if hasattr(cam.status, "value") else str(cam.status)
        streams.append({
            "id": str(cam.id),
            "camera_id": cam.camera_code,
            "name": cam.name,
            "location_name": cam.location_name,
            "district": cam.district,
            "status": cam_status,
            "rtsp_url": settings.get_authenticated_rtsp_url(cam_tag),
            "webrtc_url": f"/api/v1/streams/{cam_tag}/whep",
            "webrtc_direct_url": f"http://{DEFAULT_RTSP_HOST}:8889/stream/{cam_tag}/whep",
            "hls_url": settings.get_hls_url(cam_tag),
            "live_feed_url": f"/api/v1/streams/{cam_tag}/live-feed",
            "snapshot_url": f"/api/v1/streams/{cam_tag}/snapshot",
            "codec": cam.codec,
            "resolution": cam.resolution,
            "fps": float(cam.fps) if cam.fps else None,
            "department_id": cam.department_id,
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
                                "box": (x1, y1, x2, y2),
                            })
                except Exception as e:
                    logger.warning(f"Detection inference exception on {cam_tag}: {e}")

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
        except Exception as e:
            logger.warning(f"Detection inference exception on snapshot for {cam_tag}: {e}")

    # Header with PTS
    has_hw_pts = pts_ms > 0
    pts_display = f"PTS: {pts_ms:.1f}ms" if has_hw_pts else "PTS: HARDWARE CLOCK UNAVAILABLE"
    cv2.rectangle(frame, (10, 10), (360, 42), (10, 15, 25), -1)
    cv2.putText(frame, f"SENTINEL {cam_tag.upper()} | {pts_display}", (18, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 240, 255), 1)

    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode JPEG snapshot")

    headers = {
        "X-Sentinel-PTS-MS": str(round(pts_ms, 2)) if has_hw_pts else "UNAVAILABLE",
        "X-Sentinel-PTS-Available": "true" if has_hw_pts else "false",
        "X-Sentinel-Camera": cam_tag,
        "Cache-Control": "no-store, no-cache, must-revalidate",
    }
    return Response(
        content=buffer.tobytes(),
        media_type="image/jpeg",
        headers=headers,
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


@router.get("/{camera_id}/probe")
async def probe_camera_stream(camera_id: str):
    """
    Performs empirical multi-layer probe of camera stream and returns truthful diagnostic state:
    NETWORK_REACHABLE, AUTHENTICATED, MEDIA_ACTIVE, FRAME_ACTIVE, AI_ACTIVE,
    OFFLINE, AUTH_ERROR, STREAM_ERROR, AI_ERROR.
    """
    import socket
    cam_tag = normalize_cam_tag(camera_id)
    host = settings.SENTINEL_SANDBOX_HOST
    rtsp_port = 8554
    whep_port = 8889

    # Layer 1: Network Reachability (TCP 8554 / 8889)
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2.5)
    tcp_reachable = False
    try:
        res = s.connect_ex((host, rtsp_port))
        tcp_reachable = (res == 0)
    except Exception as e:
        logger.warning(f"TCP probe failed for {host}:{rtsp_port} - {e}")
    finally:
        s.close()

    if not tcp_reachable:
        return {
            "camera_id": camera_id,
            "cam_tag": cam_tag,
            "status": "OFFLINE",
            "details": f"TCP port {rtsp_port} unreachable on {host}",
            "network_reachable": False,
            "authenticated": False,
            "media_active": False,
            "frame_active": False,
            "ai_active": False,
        }

    # Layer 2: Authentication & Stream Protocol Check
    target_whep = f"http://{host}:{whep_port}/stream/{cam_tag}/whep"
    headers = {"Content-Type": "application/sdp"}
    creds_configured = bool(settings.SENTINEL_STREAM_USER and settings.SENTINEL_STREAM_PASSWORD)

    if creds_configured:
        creds = f"{settings.SENTINEL_STREAM_USER}:{settings.SENTINEL_STREAM_PASSWORD}".encode("utf-8")
        headers["Authorization"] = f"Basic {base64.b64encode(creds).decode('ascii')}"

    auth_success = False
    whep_status_code = None
    async with httpx.AsyncClient(timeout=4.0) as client:
        try:
            r = await client.post(target_whep, content=b"v=0", headers=headers)
            whep_status_code = r.status_code
            if r.status_code in (200, 201):
                auth_success = True
            elif r.status_code == 401:
                auth_success = False
        except Exception as e:
            logger.warning(f"WHEP HTTP probe error for {cam_tag}: {e}")

    # Layer 3: RTSP Capture & Frame Decoding
    rtsp_url = settings.get_authenticated_rtsp_url(cam_tag)
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    cap_opened = cap.isOpened()

    frame_decoded = False
    pts_ms = None
    hw_pts = False
    frame_shape = None

    if cap_opened:
        ret, frame = cap.read()
        if ret and frame is not None:
            frame_decoded = True
            frame_shape = frame.shape
            raw_pts = cap.get(cv2.CAP_PROP_POS_MSEC)
            if raw_pts > 0:
                pts_ms = round(raw_pts, 2)
                hw_pts = True
            else:
                pts_ms = 0.0
                hw_pts = False
        cap.release()
    else:
        cap.release()

    # Layer 4: AI Inference on Decoded Frame
    ai_success = False
    ai_error_msg = None
    detections_found = []
    if frame_decoded:
        detector = get_detector()
        if detector:
            try:
                results = detector(frame, verbose=False, conf=0.35, classes=[0, 1, 2, 3, 5, 7])
                ai_success = True
                for r in results:
                    for box in r.boxes:
                        detections_found.append({
                            "class": CLASS_NAMES.get(int(box.cls[0].item()), "vehicle"),
                            "conf": round(float(box.conf[0].item()), 3),
                        })
            except Exception as e:
                ai_error_msg = str(e)
                logger.error(f"AI inference error on {cam_tag}: {e}")

    # Classify State Deterministically
    if not tcp_reachable:
        final_status = "OFFLINE"
    elif whep_status_code == 401 and not cap_opened:
        final_status = "AUTH_ERROR"
    elif not cap_opened and not auth_success:
        final_status = "AUTH_ERROR" if whep_status_code == 401 else "STREAM_ERROR"
    elif cap_opened and not frame_decoded:
        final_status = "STREAM_ERROR"
    elif frame_decoded and not ai_success and ai_error_msg:
        final_status = "AI_ERROR"
    elif frame_decoded and ai_success:
        final_status = "AI_ACTIVE"
    elif frame_decoded:
        final_status = "FRAME_ACTIVE"
    elif auth_success:
        final_status = "AUTHENTICATED"
    else:
        final_status = "NETWORK_REACHABLE"

    return {
        "camera_id": camera_id,
        "cam_tag": cam_tag,
        "status": final_status,
        "network_reachable": tcp_reachable,
        "authenticated": auth_success,
        "credentials_configured": creds_configured,
        "whep_http_code": whep_status_code,
        "media_active": cap_opened or auth_success,
        "frame_active": frame_decoded,
        "ai_active": ai_success,
        "hardware_pts_detected": hw_pts,
        "pts_timestamp_ms": pts_ms,
        "frame_shape": list(frame_shape) if frame_shape else None,
        "detections_count": len(detections_found),
        "detections": detections_found,
    }
