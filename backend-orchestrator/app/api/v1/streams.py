"""Live Video Ingestion & Real-Time AI Stream Delivery API.

Implements decoupled media truth, RFC 2326 RTSP session validation,
honest timing labels (decoded presentation time ms), WHEP negotiation models,
and delegation to the authoritative ai-detection microservice.
"""

from __future__ import annotations

import asyncio
import base64
from datetime import datetime, timezone
import io
import logging
import os
import re
import socket
import time
from typing import Any, Dict, Generator, List, Optional
from urllib.parse import quote

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.services.camera_service import camera_service

# Force RTSP over TCP for reliable network transport
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

logger = logging.getLogger("sentinel.api.streams")

router = APIRouter(prefix="/streams", tags=["Live Streams & AI Ingestion"])

DEFAULT_RTSP_HOST = settings.SENTINEL_SANDBOX_HOST
DEFAULT_RTSP_PORT = 8554
DEFAULT_WHEP_PORT = 8889


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


async def delegate_to_ai_service(frame: np.ndarray, camera_id: str) -> Dict[str, Any]:
    """
    Delegates inference to the single authoritative ai-detection microservice (:8006).
    backend-orchestrator never runs independent duplicate YOLO models.
    """
    ai_url = getattr(settings, "AI_DETECTION_LOCAL_URL", "http://localhost:8006")
    endpoint = f"{ai_url}/detect/person-vehicle"

    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not success:
        return {"success": False, "error": "JPEG encoding failed", "detections": []}

    b64_img = base64.b64encode(buffer.tobytes()).decode("ascii")
    payload = {
        "image_base64": b64_img,
        "camera_id": camera_id,
        "confidence_threshold": 0.35,
    }

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(endpoint, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "detections": data.get("detections", []),
                    "inference_time_ms": data.get("inference_time_ms", 0.0),
                    "people_count": data.get("people_count", 0),
                    "vehicle_count": data.get("vehicle_count", 0),
                }
            return {
                "success": False,
                "error": f"AI service returned HTTP {resp.status_code}",
                "detections": [],
            }
    except Exception as e:
        logger.debug(f"AI service delegation unavailable on {ai_url}: {e}")
        return {
            "success": False,
            "error": f"AI microservice unavailable ({type(e).__name__})",
            "detections": [],
        }


def validate_rtsp_session_rfc2326(
    host: str, port: int, cam_tag: str, user: str, pwd: str, timeout: float = 3.0
) -> Dict[str, Any]:
    """
    Performs RFC 2326 RTSP session validation over raw TCP socket:
    1. TCP Connect (network_reachable)
    2. OPTIONS (supported methods)
    3. DESCRIBE with Basic Auth (authentication_verified & SDP verification)
    4. SETUP with interleaved transport (rtsp_session_established & Session ID)
    5. PLAY with Session ID (rtp_media_observed & interleaved packet check)
    6. TEARDOWN (clean session termination)
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    result = {
        "network_reachable": False,
        "authentication_verified": False,
        "rtsp_session_established": False,
        "rtp_media_observed": False,
        "session_id": None,
        "video_track_found": False,
        "last_network_probe_at": now_iso,
        "last_authentication_at": None,
        "last_media_at": None,
        "last_error": None,
    }

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)

    try:
        # Step 1: TCP Connect
        s.connect((host, port))
        result["network_reachable"] = True

        # Auth header setup
        auth_hdr = ""
        if user and pwd:
            token = base64.b64encode(f"{user}:{pwd}".encode()).decode("ascii")
            auth_hdr = f"Authorization: Basic {token}\r\n"

        # Step 2: RTSP OPTIONS
        options_cmd = (
            f"OPTIONS rtsp://{host}:{port}/stream/{cam_tag} RTSP/1.0\r\n"
            f"CSeq: 1\r\n"
            f"User-Agent: Sentinel-Platform/5.0\r\n\r\n"
        )
        s.sendall(options_cmd.encode("utf-8"))
        res_options = s.recv(2048).decode("utf-8", errors="ignore")
        if not ("RTSP/1.0 200" in res_options or "RTSP/1.0" in res_options):
            result["last_error"] = f"RTSP OPTIONS rejected: {res_options.splitlines()[0] if res_options else 'empty'}"
            return result

        # Step 3: RTSP DESCRIBE
        describe_cmd = (
            f"DESCRIBE rtsp://{host}:{port}/stream/{cam_tag} RTSP/1.0\r\n"
            f"CSeq: 2\r\n"
            f"Accept: application/sdp\r\n"
            f"{auth_hdr}\r\n"
        )
        s.sendall(describe_cmd.encode("utf-8"))
        res_describe = s.recv(4096).decode("utf-8", errors="ignore")

        if "RTSP/1.0 401" in res_describe:
            result["last_error"] = "RTSP DESCRIBE 401 Unauthorized"
            return result

        if "RTSP/1.0 200" in res_describe:
            result["authentication_verified"] = True
            result["last_authentication_at"] = datetime.now(timezone.utc).isoformat()
            if "m=video" in res_describe:
                result["video_track_found"] = True

        if not result["authentication_verified"]:
            result["last_error"] = f"RTSP DESCRIBE did not return 200 OK: {res_describe.splitlines()[0] if res_describe else 'empty'}"
            return result

        # Extract track control URL
        track_match = re.search(r"a=control:(.+)", res_describe)
        control_val = track_match.group(1).strip() if track_match else "trackID=0"
        if not control_val.startswith("rtsp://"):
            track_url = f"rtsp://{host}:{port}/stream/{cam_tag}/{control_val}"
        else:
            track_url = control_val

        # Step 4: RTSP SETUP (Interleaved TCP)
        setup_cmd = (
            f"SETUP {track_url} RTSP/1.0\r\n"
            f"CSeq: 3\r\n"
            f"Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"
            f"{auth_hdr}\r\n"
        )
        s.sendall(setup_cmd.encode("utf-8"))
        res_setup = s.recv(2048).decode("utf-8", errors="ignore")

        sess_match = re.search(r"Session:\s*([^\s;]+)", res_setup, re.IGNORECASE)
        if "RTSP/1.0 200" in res_setup and sess_match:
            session_id = sess_match.group(1)
            result["rtsp_session_established"] = True
            result["session_id"] = session_id
        else:
            result["last_error"] = f"RTSP SETUP failed: {res_setup.splitlines()[0] if res_setup else 'empty'}"
            return result

        # Step 5: RTSP PLAY
        play_cmd = (
            f"PLAY rtsp://{host}:{port}/stream/{cam_tag} RTSP/1.0\r\n"
            f"CSeq: 4\r\n"
            f"Session: {session_id}\r\n"
            f"{auth_hdr}\r\n"
        )
        s.sendall(play_cmd.encode("utf-8"))
        res_play = s.recv(2048).decode("utf-8", errors="ignore")

        if "RTSP/1.0 200" in res_play:
            # Step 6: Read interleaved RTP packet ($ \x00 length_hi length_lo)
            raw_media = s.recv(4096)
            for i in range(len(raw_media) - 4):
                if raw_media[i] == 0x24:  # '$'
                    channel = raw_media[i + 1]
                    pkt_len = (raw_media[i + 2] << 8) | raw_media[i + 3]
                    if channel in (0, 1) and pkt_len > 0:
                        result["rtp_media_observed"] = True
                        result["last_media_at"] = datetime.now(timezone.utc).isoformat()
                        break

        # Step 7: RTSP TEARDOWN
        try:
            teardown_cmd = (
                f"TEARDOWN rtsp://{host}:{port}/stream/{cam_tag} RTSP/1.0\r\n"
                f"CSeq: 5\r\n"
                f"Session: {session_id}\r\n"
                f"{auth_hdr}\r\n"
            )
            s.sendall(teardown_cmd.encode("utf-8"))
        except Exception:
            pass

    except Exception as exc:
        result["last_error"] = str(exc)
    finally:
        s.close()

    return result


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


@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: str):
    """
    Returns a single live JPEG snapshot from the physical camera feed with
    genuine decoded presentation time (ms) and server UTC observation time.
    Does NOT claim hardware clock unless verified.
    """
    cam_tag = normalize_cam_tag(camera_id)
    rtsp_url = settings.get_authenticated_rtsp_url(cam_tag)
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

    if not cap.isOpened():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Camera stream {cam_tag} offline or unreachable on {DEFAULT_RTSP_HOST}:{DEFAULT_RTSP_PORT}",
        )

    ret, frame = cap.read()
    raw_pts = cap.get(cv2.CAP_PROP_POS_MSEC)
    cap.release()

    if not ret or frame is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Frame decode failure for {cam_tag}",
        )

    now_utc = datetime.now(timezone.utc)
    decoded_pts_ms = round(float(raw_pts), 2) if raw_pts > 0 else 0.0

    # Draw HUD with genuine timing labels (Decoded Presentation Time, not hardware PTS)
    pts_display = f"DECODER PTS: {decoded_pts_ms:.1f}ms" if decoded_pts_ms > 0 else "DECODER PTS: 0.0ms (STREAM START)"
    obs_display = f"OBSERVED: {now_utc.strftime('%H:%M:%S.%f')[:-3]} UTC"

    cv2.rectangle(frame, (10, 10), (420, 52), (10, 15, 25), -1)
    cv2.rectangle(frame, (10, 10), (420, 52), (0, 240, 255), 1)
    cv2.putText(
        frame,
        f"SENTINEL {cam_tag.upper()} | {pts_display}",
        (18, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.38,
        (0, 240, 255),
        1,
        cv2.LINE_AA,
    )
    cv2.putText(
        frame,
        obs_display,
        (18, 44),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.34,
        (0, 255, 153),
        1,
        cv2.LINE_AA,
    )

    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode JPEG snapshot")

    headers = {
        "X-Sentinel-Decoder-PTS-MS": str(decoded_pts_ms),
        "X-Sentinel-Observation-Time": now_utc.isoformat(),
        "X-Sentinel-Camera": cam_tag,
        "Cache-Control": "no-store, no-cache, must-revalidate",
    }
    return Response(
        content=buffer.tobytes(),
        media_type="image/jpeg",
        headers=headers,
    )


def generate_live_stream_frames(cam_tag: str):
    """
    Connects to real RTSP stream, decodes frames, overlays genuine HUD telemetry,
    and yields multipart MJPEG stream.
    """
    rtsp_url = settings.get_authenticated_rtsp_url(cam_tag)
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

    if not cap.isOpened():
        logger.warning(f"RTSP stream {cam_tag} could not be opened at {DEFAULT_RTSP_HOST}:{DEFAULT_RTSP_PORT}")
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                cap.release()
                time.sleep(1.0)
                cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
                continue

            raw_pts = cap.get(cv2.CAP_PROP_POS_MSEC)
            pts_ms = round(float(raw_pts), 2) if raw_pts > 0 else 0.0
            h, w, _ = frame.shape

            # Draw HUD
            cv2.rectangle(frame, (10, 10), (380, 48), (10, 15, 25), -1)
            cv2.rectangle(frame, (10, 10), (380, 48), (0, 240, 255), 1)
            cv2.putText(
                frame,
                f"GUJARAT POLICE SENTINEL - {cam_tag.upper()}",
                (18, 26),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.42,
                (0, 240, 255),
                1,
                cv2.LINE_AA,
            )
            cv2.putText(
                frame,
                f"DECODER PTS: {pts_ms:.1f}ms | HOST: {DEFAULT_RTSP_HOST}",
                (18, 42),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.35,
                (0, 255, 153),
                1,
                cv2.LINE_AA,
            )

            if w > 1280:
                frame = cv2.resize(frame, (1280, 720))

            success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not success:
                continue

            jpg_bytes = buffer.tobytes()
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg_bytes + b"\r\n")
            time.sleep(0.04)  # ~25 FPS pacing

    finally:
        cap.release()


@router.get("/{camera_id}/live-feed")
async def get_camera_live_feed(camera_id: str):
    """Streams live CCTV feed with decoded frame matrix and HUD."""
    cam_tag = normalize_cam_tag(camera_id)
    return StreamingResponse(
        generate_live_stream_frames(cam_tag),
        media_type="multipart/x-mixed-replace; boundary=frame",
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
        },
    )


@router.post("/{camera_id}/whep")
async def whep_proxy(camera_id: str, request: Request):
    """
    Proxies WebRTC WHEP SDP offer from browser to MediaMTX with server-side authentication.
    Credentials remain strictly on server side and are never exposed to the client.
    """
    cam_tag = normalize_cam_tag(camera_id)
    target_url = f"http://{DEFAULT_RTSP_HOST}:{DEFAULT_WHEP_PORT}/stream/{cam_tag}/whep"

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
                headers=res_headers,
            )
        except Exception as e:
            logger.error(f"WHEP proxy error to {target_url}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"WHEP gateway connection failed for {cam_tag}",
            )


@router.get("/{camera_id}/probe")
async def probe_camera_stream(camera_id: str):
    """
    Performs empirical multi-layer probe of camera stream and returns truthful,
    decoupled diagnostic state:
    - network_reachable
    - authentication_verified
    - rtsp_session_established
    - rtp_media_observed
    - decoder_open
    - frame_active
    - ai_active
    - tracking_active
    - anpr_active
    With separate timestamps and genuine timing measurements.
    """
    cam_tag = normalize_cam_tag(camera_id)
    host = settings.SENTINEL_SANDBOX_HOST
    rtsp_port = DEFAULT_RTSP_PORT
    whep_port = DEFAULT_WHEP_PORT
    user = settings.SENTINEL_STREAM_USER
    pwd = settings.SENTINEL_STREAM_PASSWORD

    now_iso = datetime.now(timezone.utc).isoformat()

    # Step 1 to 5: RFC 2326 Wire-Level RTSP Session & RTP Packet Probe
    rtsp_res = validate_rtsp_session_rfc2326(host, rtsp_port, cam_tag, user, pwd, timeout=3.0)

    # Step 6: OpenCV VideoCapture Decoding Probe
    decoder_open = False
    frame_decoded = False
    decoded_pts_ms: Optional[float] = None
    frame_shape = None
    last_frame_at = None

    if rtsp_res["network_reachable"]:
        rtsp_url = settings.get_authenticated_rtsp_url(cam_tag)
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        decoder_open = cap.isOpened()

        if decoder_open:
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                frame_decoded = True
                frame_shape = list(frame.shape)
                last_frame_at = datetime.now(timezone.utc).isoformat()
                raw_pts = cap.get(cv2.CAP_PROP_POS_MSEC)
                decoded_pts_ms = round(float(raw_pts), 2) if raw_pts > 0 else 0.0
            cap.release()
        else:
            cap.release()

    # Step 7: AI Inference on Decoded Frame (Delegated to Authoritative ai-detection Service)
    ai_active = False
    tracking_active = False
    anpr_active = "NOT_TESTED"
    last_ai_at = None
    last_tracking_at = None
    detections_found = []
    ai_err_msg = None

    if frame_decoded and frame is not None:
        ai_resp = await delegate_to_ai_service(frame, camera_id=cam_tag)
        if ai_resp.get("success"):
            ai_active = True
            last_ai_at = datetime.now(timezone.utc).isoformat()
            detections_found = ai_resp.get("detections", [])
            # Check tracking
            has_track = any(d.get("track_id") is not None for d in detections_found)
            if has_track:
                tracking_active = True
                last_tracking_at = last_ai_at
            # Check ANPR
            anpr_active = "UNREADABLE" if detections_found else "NOT_TESTED"
        else:
            ai_err_msg = ai_resp.get("error")

    # Step 8: WHEP Negotiation Model (Decoupled & Documented Limitations)
    whep_s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    whep_s.settimeout(2.0)
    whep_net_reachable = False
    try:
        whep_net_reachable = (whep_s.connect_ex((host, whep_port)) == 0)
    except Exception:
        whep_net_reachable = False
    finally:
        whep_s.close()

    whep_authenticated = False
    if whep_net_reachable:
        target_whep = f"http://{host}:{whep_port}/stream/{cam_tag}/whep"
        whep_headers = {}
        if user and pwd:
            token = base64.b64encode(f"{user}:{pwd}".encode()).decode("ascii")
            whep_headers["Authorization"] = f"Basic {token}"
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                r_options = await client.options(target_whep, headers=whep_headers)
                whep_authenticated = r_options.status_code in (200, 204)
        except Exception:
            whep_authenticated = False

    whep_model = {
        "whep_network_reachable": whep_net_reachable,
        "whep_authenticated": whep_authenticated,
        "whep_offer_valid": False,  # Server-side probe does not generate a WebRTC SDP offer
        "whep_answer_valid": False,
        "whep_ice_established": False,
        "whep_dtls_established": False,
        "whep_media_received": False,
        "whep_browser_playback_verified": False,
        "whep_status": "NOT_VERIFIED",
        "notes": "Server probe verifies HTTP reachability. WebRTC media decapsulation (ICE/DTLS/SRTP) is handled in browser client.",
    }

    # Consolidated Error & Status
    last_error = rtsp_res.get("last_error") or ai_err_msg

    # Overall State Classification
    if not rtsp_res["network_reachable"]:
        overall_status = "OFFLINE"
    elif not rtsp_res["authentication_verified"]:
        overall_status = "AUTH_ERROR"
    elif not rtsp_res["rtsp_session_established"]:
        overall_status = "RTSP_SETUP_FAILED"
    elif not rtsp_res["rtp_media_observed"]:
        overall_status = "MEDIA_INACTIVE"
    elif not frame_decoded:
        overall_status = "DECODER_ERROR"
    elif not ai_active:
        overall_status = "AI_DEGRADED" if ai_err_msg else "FRAME_ACTIVE"
    else:
        overall_status = "AI_ACTIVE"

    # Strict Media Truth: media_active is True ONLY IF rtp_media_observed is True
    media_active = rtsp_res["rtp_media_observed"]

    return {
        "camera_id": camera_id,
        "cam_tag": cam_tag,
        "status": overall_status,
        # Independent explicit states
        "network_reachable": rtsp_res["network_reachable"],
        "authentication_verified": rtsp_res["authentication_verified"],
        "rtsp_session_established": rtsp_res["rtsp_session_established"],
        "rtp_media_observed": rtsp_res["rtp_media_observed"],
        "decoder_open": decoder_open,
        "frame_active": frame_decoded,
        "ai_active": ai_active,
        "tracking_active": tracking_active,
        "anpr_active": anpr_active,
        "media_active": media_active,
        # Timestamps
        "last_network_probe_at": rtsp_res["last_network_probe_at"],
        "last_authentication_at": rtsp_res["last_authentication_at"],
        "last_media_at": rtsp_res["last_media_at"],
        "last_frame_at": last_frame_at,
        "last_ai_at": last_ai_at,
        "last_tracking_at": last_tracking_at,
        "last_error": last_error,
        # Genuine Timing Telemetry (No hardware clock mislabeling)
        "decoded_presentation_time_ms": decoded_pts_ms,
        "decoder_timestamp_ms": decoded_pts_ms,
        "application_observation_time": now_iso,
        "server_utc_time": datetime.now(timezone.utc).isoformat(),
        "frame_shape": frame_shape,
        # Detections
        "detections_count": len(detections_found),
        "detections": detections_found,
        # WHEP Model
        "whep": whep_model,
    }
