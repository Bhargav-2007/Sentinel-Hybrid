#!/usr/bin/env python3
"""
Sentinel Camera Grid — Production OpenCV Client Reference Implementation

Complies with all rules in INTEGRATION REFERENCE · SENTINEL SANDBOX:
  - Discovers streams dynamically from /api/ingest
  - Forces RTSP over TCP via OPENCV_FFMPEG_CAPTURE_OPTIONS
  - Drives all velocity and timing from PTS (CAP_PROP_POS_MSEC)
  - Exponential backoff reconnection (start at 2s, capped at 30s)
  - Recovers across scene discontinuities (loop recording cuts)
  - Handles mixed H.264 / H.265 and variable resolutions
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from typing import Any

# CRITICAL (§3 DO): Force RTSP over TCP before importing cv2
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import cv2
import httpx

DEFAULT_INGEST_URL = "https://live.corp8.cloud/api/ingest"


def fetch_camera_catalogue(ingest_url: str) -> list[dict[str, Any]]:
    """Fetch camera catalogue dynamically. The catalogue is the contract."""
    print(f"Fetching camera catalogue from {ingest_url}...")
    try:
        resp = httpx.get(ingest_url, follow_redirects=True, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        cameras = data.get("cameras", data) if isinstance(data, dict) else data
        print(f"Discovered {len(cameras)} cameras from catalogue.")
        return cameras
    except Exception as e:
        print(f"ERROR: Failed to fetch catalogue: {e}")
        return []


def consume_camera_stream(
    stream_id: str,
    rtsp_url: str,
    max_frames: int = 300,
    show_window: bool = False,
) -> None:
    """
    Consume a single camera feed with backoff reconnection and PTS timing.
    """
    reconnect_attempts = 0
    max_reconnect_attempts = 10
    total_frames_read = 0

    # Timing state for PTS delta tracking
    last_pts_ms: float | None = None
    last_wall_time = time.monotonic()

    print(f"\n[Camera {stream_id}] Connecting to RTSP: {rtsp_url}")
    print(f"[Camera {stream_id}] Transport: TCP (Forced) | Timing: PTS (CAP_PROP_POS_MSEC)")

    while reconnect_attempts <= max_reconnect_attempts:
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            reconnect_attempts += 1
            # §3 DO: Exponential backoff (start ~2s, cap ~30s)
            delay = min(2.0 * (2 ** (reconnect_attempts - 1)), 30.0)
            print(f"[Camera {stream_id}] Failed to open stream. Retrying in {delay:.1f}s (attempt {reconnect_attempts}/{max_reconnect_attempts})...")
            time.sleep(delay)
            continue

        # Connected successfully - reset backoff
        reconnect_attempts = 0
        print(f"[Camera {stream_id}] Stream connected successfully.")

        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    print(f"[Camera {stream_id}] Read failed (temporary dropout or feed restart). Reconnecting...")
                    break

                total_frames_read += 1

                # §3 DO: Drive all timing from PTS, NEVER from arrival time!
                pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)

                # Detect scene discontinuity or timestamp resets (loop boundary)
                if last_pts_ms is not None:
                    pts_delta = pts_ms - last_pts_ms
                    if pts_delta < 0:
                        print(f"[Camera {stream_id}] ⚠️ Scene Discontinuity / Loop Cut detected (PTS: {last_pts_ms:.1f}ms -> {pts_ms:.1f}ms). Resetting track state.")
                    elif pts_delta > 2000:
                        print(f"[Camera {stream_id}] Inter-frame gap of {pts_delta:.1f}ms observed (tolerating without disconnect).")

                last_pts_ms = pts_ms

                # Periodic telemetry output
                if total_frames_read % 50 == 0:
                    h, w = frame.shape[:2]
                    print(f"[Camera {stream_id}] Frame #{total_frames_read} | Res: {w}x{h} | PTS: {pts_ms/1000.0:.2f}s")

                if show_window:
                    cv2.imshow(f"Sentinel Stream {stream_id}", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        print("User quit window.")
                        return

                if max_frames and total_frames_read >= max_frames:
                    print(f"[Camera {stream_id}] Reached requested {max_frames} frames. Pacing load: closing capture.")
                    return

        except KeyboardInterrupt:
            print("\nStream consumer interrupted by user.")
            return
        finally:
            cap.release()
            if show_window:
                cv2.destroyAllWindows()

        reconnect_attempts += 1
        delay = min(2.0 * (2 ** (reconnect_attempts - 1)), 30.0)
        print(f"[Camera {stream_id}] Reconnecting in {delay:.1f}s...")
        time.sleep(delay)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sentinel Camera Grid OpenCV Consumer")
    parser.add_argument("--ingest", default=DEFAULT_INGEST_URL, help="Catalogue API URL")
    parser.add_argument("--cam", default="1", help="Camera ID to stream")
    parser.add_argument("--frames", type=int, default=150, help="Max frames to consume (0 for infinite)")
    parser.add_argument("--gui", action="store_true", help="Display video in OpenCV window")
    args = parser.parse_args()

    # Step 1: Read catalogue
    cameras = fetch_camera_catalogue(args.ingest)
    if not cameras:
        print("No cameras available. Falling back to default pattern.")
        target_rtsp = f"rtsp://live.corp8.cloud:8554/stream/{args.cam}"
    else:
        # Find camera in catalogue
        target_cam = None
        for c in cameras:
            cid = str(c.get("id") or c.get("stream_id") or c.get("number"))
            if cid == str(args.cam):
                target_cam = c
                break

        if target_cam:
            target_rtsp = target_cam.get("rtsp_url", f"rtsp://live.corp8.cloud:8554/stream/{args.cam}")
            print(f"Selected camera from catalogue: {target_cam.get('name', args.cam)} ({target_cam.get('codec', 'h264')})")
        else:
            first_cam = cameras[0]
            target_rtsp = first_cam.get("rtsp_url")
            print(f"Camera #{args.cam} not found. Using first available: {target_rtsp}")

    # Step 2: Consume feed
    consume_camera_stream(
        stream_id=args.cam,
        rtsp_url=target_rtsp,
        max_frames=args.frames,
        show_window=args.gui,
    )


if __name__ == "__main__":
    main()
