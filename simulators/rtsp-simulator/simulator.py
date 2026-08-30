"""
Gujarat Sentinel — RTSP Simulator
Synthetic RTSP stream generator for hackathon demo

Generates N synthetic camera streams using MediaMTX (RTSP server)
with Python-generated video frames containing:
  - Camera metadata overlay (ID, name, district, timestamp)
  - Synthetic vehicle detection boxes with license plates (Indian format)
  - Traffic scene background (configurable density)
  - Fake ANPR-detectable plates (GJ-XX-XX-XXXX format)

Architecture:
  - FastAPI server for /api/ingest catalogue endpoint
  - MediaMTX for RTSP/HLS/WebRTC relay
  - Python subprocess per camera writing synthetic frames via FFmpeg pipe
"""

from __future__ import annotations

import asyncio
import io
import json
import math
import os
import random
import re
import subprocess
import time
from datetime import datetime, timezone
from typing import Any

import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from PIL import Image, ImageDraw, ImageFont

# ── Camera configuration ────────────────────────────────────────────────────
CAMERA_COUNT = int(os.getenv("CAMERA_COUNT", "50"))
FRAME_RATE = int(os.getenv("FRAME_RATE", "25"))
RESOLUTION = os.getenv("RESOLUTION", "1280x720")
RTSP_PORT = int(os.getenv("RTSP_PORT", "8554"))
WEBRTC_PORT = int(os.getenv("WEBRTC_PORT", "8889"))
HLS_PORT = int(os.getenv("HLS_PORT", "8888"))
API_PORT = int(os.getenv("API_PORT", "8092"))

WIDTH, HEIGHT = map(int, RESOLUTION.split("x"))

# ── Gujarat districts and locations ─────────────────────────────────────────
GUJARAT_CAMERAS = [
    {"district": "Ahmedabad", "lat": 23.0225, "lon": 72.5714, "area": "Naroda"},
    {"district": "Ahmedabad", "lat": 23.0395, "lon": 72.5310, "area": "Satellite"},
    {"district": "Ahmedabad", "lat": 23.0127, "lon": 72.5064, "area": "Navrangpura"},
    {"district": "Surat", "lat": 21.1702, "lon": 72.8311, "area": "Adajan"},
    {"district": "Surat", "lat": 21.1959, "lon": 72.8203, "area": "Vesu"},
    {"district": "Vadodara", "lat": 22.3072, "lon": 73.1812, "area": "Alkapuri"},
    {"district": "Rajkot", "lat": 22.3039, "lon": 70.8022, "area": "Raiya Road"},
    {"district": "Bhavnagar", "lat": 21.7645, "lon": 72.1519, "area": "Ghogha Circle"},
    {"district": "Jamnagar", "lat": 22.4707, "lon": 70.0577, "area": "Bedi Gate"},
    {"district": "Junagadh", "lat": 21.5222, "lon": 70.4579, "area": "Kalwa Chowk"},
    {"district": "Gandhinagar", "lat": 23.2156, "lon": 72.6369, "area": "Sector 21"},
    {"district": "Anand", "lat": 22.5645, "lon": 72.9289, "area": "Station Road"},
    {"district": "Mehsana", "lat": 23.5880, "lon": 72.3693, "area": "Highway Junction"},
    {"district": "Patan", "lat": 23.8493, "lon": 72.1266, "area": "Rani Vav"},
    {"district": "Banaskantha", "lat": 24.1691, "lon": 72.4388, "area": "Palanpur Bus"},
    {"district": "Dahod", "lat": 22.8374, "lon": 74.2543, "area": "Clock Tower"},
    {"district": "Valsad", "lat": 20.6071, "lon": 72.9249, "area": "Station Chowk"},
    {"district": "Somnath", "lat": 20.9020, "lon": 70.3699, "area": "Temple Road"},
    {"district": "Dwarka", "lat": 22.2394, "lon": 68.9678, "area": "Dwarkadish Temple"},
    {"district": "Morbi", "lat": 22.8168, "lon": 70.8369, "area": "Wankaner Road"},
]

DEPARTMENTS = ["HOME", "RTO", "FOOD", "MC", "NHAI", "GSRTC", "PORT", "METRO"]
CAMERA_TYPES = ["dome", "bullet", "ptz", "fisheye"]
CODECS = ["h264", "h264", "h264", "h265"]  # Weighted: 3:1 h264/h265

# ── Indian license plate format ──────────────────────────────────────────────
GJ_DISTRICTS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
                 "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]

def generate_plate() -> str:
    """Generate a realistic Gujarat (GJ) license plate."""
    district = random.choice(GJ_DISTRICTS)
    series = "".join(random.choices("ABCDEFGHJKLMNPRSTUVWXYZ", k=2))
    number = random.randint(1000, 9999)
    return f"GJ {district} {series} {number}"

# ── Pre-generate camera list ────────────────────────────────────────────────
rng = random.Random(42)  # Deterministic for consistent demo

cameras_catalog = []
for i in range(CAMERA_COUNT):
    location = GUJARAT_CAMERAS[i % len(GUJARAT_CAMERAS)].copy()
    # Add slight position jitter
    location["lat"] += rng.uniform(-0.01, 0.01)
    location["lon"] += rng.uniform(-0.01, 0.01)

    dept = DEPARTMENTS[i % len(DEPARTMENTS)]
    cam_type = rng.choice(CAMERA_TYPES)
    codec = rng.choice(CODECS)

    cameras_catalog.append({
        "id": f"stream/{i+1}",
        "stream_id": i + 1,
        "camera_id": f"{dept}-{location['district'][:3].upper()}-{i+1:03d}",
        "name": f"{location['area']} Camera {i+1}",
        "location": {
            "latitude": round(location["lat"], 6),
            "longitude": round(location["lon"], 6),
            "district": location["district"],
            "address": f"{location['area']}, {location['district']}, Gujarat",
        },
        "department": dept,
        "codec": codec,
        "live": True,
        "resolution": RESOLUTION,
        "frame_rate": FRAME_RATE,
        "bitrate_kbps": 2048 if codec == "h265" else 4096,
        "rtsp_url": f"rtsp://rtsp-simulator:{RTSP_PORT}/stream/{i+1}",
        "hls_url": f"http://rtsp-simulator:{HLS_PORT}/live/stream/{i+1}/index.m3u8",
        "webrtc_url": f"http://rtsp-simulator:{WEBRTC_PORT}/stream/{i+1}/whep",
        "camera_type": cam_type,
        "storage_type": rng.choice(["cloud", "local_nvr", "edge_device"]),
        "retention_days": rng.choice([7, 15, 30]),
        "is_public_domain": True,
        "vendor": rng.choice(["Hikvision", "Dahua", "Axis", "Bosch", "Hanwha"]),
    })


# ── FastAPI ingest API ───────────────────────────────────────────────────────
app = FastAPI(title="Sentinel RTSP Simulator", version="1.0.0")


@app.get("/api/ingest")
async def get_ingest_catalogue():
    """
    Sentinel-compatible /api/ingest endpoint.
    Returns the same format as https://live.corp8.cloud/api/ingest
    """
    return JSONResponse(content=cameras_catalog)


@app.get("/api/ingest/{stream_id}")
async def get_stream_details(stream_id: int):
    """Get details for a specific stream."""
    for cam in cameras_catalog:
        if cam["stream_id"] == stream_id:
            return JSONResponse(content=cam)
    return JSONResponse(content={"error": "Stream not found"}, status_code=404)


@app.get("/health")
async def health():
    return {"status": "healthy", "camera_count": CAMERA_COUNT}


# ── Video frame generation ───────────────────────────────────────────────────

def generate_frame(camera: dict, frame_num: int) -> np.ndarray:
    """
    Generate a synthetic video frame for a camera.

    Frame contents:
    - Dark blue/grey background (night scene)
    - Randomly moving "vehicles" (coloured rectangles)
    - License plate text on vehicles (periodically)
    - Camera overlay (ID, timestamp, district)
    - GPS coordinates display
    """
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(30, 35, 45))
    draw = ImageDraw.Draw(img)

    # ── Background: road markings ──────────────────────────────────────────
    # Road surface
    draw.rectangle([0, HEIGHT//2, WIDTH, HEIGHT], fill=(50, 50, 55))
    # Road lines
    for x in range(0, WIDTH, 80):
        if (x // 80 + frame_num // 10) % 3 != 0:  # Animated dashes
            draw.rectangle([x, HEIGHT * 2 // 3, x + 40, HEIGHT * 2 // 3 + 5],
                          fill=(200, 200, 100))
    # Footpath
    draw.rectangle([0, HEIGHT * 3 // 5, WIDTH, HEIGHT * 2 // 3], fill=(100, 100, 105))

    # ── Moving vehicles ────────────────────────────────────────────────────
    rng_frame = random.Random(camera["stream_id"] * 1000 + frame_num // 5)
    n_vehicles = rng_frame.randint(2, 6)

    for v in range(n_vehicles):
        # Vehicle position (moves across frame)
        speed = rng_frame.uniform(2, 8)
        x_offset = (frame_num * speed + v * (WIDTH // n_vehicles)) % (WIDTH + 200) - 100
        y = HEIGHT * 2 // 3 + rng_frame.randint(-20, 60)
        w = rng_frame.randint(80, 160)
        h = rng_frame.randint(40, 70)

        color = rng_frame.choice([(200, 50, 50), (50, 150, 200), (200, 200, 50),
                                   (150, 100, 200), (50, 200, 100), (200, 120, 50)])
        draw.rectangle([x_offset, y, x_offset + w, y + h], fill=color)

        # License plate (on front/rear of vehicle)
        if 20 < x_offset < WIDTH - 20:
            plate_x = x_offset + w // 4
            plate_y = y + h - 15
            plate = generate_plate()
            draw.rectangle([plate_x, plate_y, plate_x + 90, plate_y + 18],
                          fill=(255, 255, 255))
            draw.rectangle([plate_x + 1, plate_y + 1, plate_x + 89, plate_y + 17],
                          outline=(0, 0, 0))
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
            except Exception:
                font = ImageFont.load_default()
            draw.text((plate_x + 3, plate_y + 2), plate, fill=(0, 0, 0), font=font)

    # ── Camera information overlay ─────────────────────────────────────────
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except Exception:
        font_large = ImageFont.load_default()
        font_small = font_large

    # Semi-transparent top bar
    overlay = Image.new("RGBA", (WIDTH, 60), (0, 0, 0, 180))
    img.paste(Image.fromarray(np.array(overlay)[:, :, :3]), (0, 0))

    now = datetime.now(tz=timezone.utc)
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S UTC")

    draw.text((10, 8), f"📹 {camera['camera_id']}", fill=(255, 255, 100), font=font_large)
    draw.text((10, 32), f"{camera['location']['district']} | {camera['name']}", fill=(200, 200, 200), font=font_small)
    draw.text((WIDTH - 280, 8), timestamp, fill=(100, 255, 100), font=font_small)
    draw.text((WIDTH - 280, 28), f"Lat: {camera['location']['latitude']:.4f}", fill=(150, 200, 255), font=font_small)
    draw.text((WIDTH - 280, 44), f"Lon: {camera['location']['longitude']:.4f}", fill=(150, 200, 255), font=font_small)

    # Bottom overlay: department and stream info
    draw.text((10, HEIGHT - 25), f"Dept: {camera['department']} | Codec: {camera['codec'].upper()}",
              fill=(180, 180, 180), font=font_small)
    draw.text((WIDTH - 150, HEIGHT - 25), f"Frame: {frame_num}", fill=(100, 150, 100), font=font_small)

    return np.array(img)


async def stream_camera_frames(camera: dict) -> None:
    """
    Stream synthetic frames for one camera via FFmpeg pipe to MediaMTX.

    Writes frames as raw RGB bytes to FFmpeg stdin, which encodes as H.264/H.265
    and publishes to MediaMTX RTSP server.
    """
    stream_id = camera["stream_id"]
    codec = "libx265" if camera["codec"] == "h265" else "libx264"

    ffmpeg_cmd = [
        "ffmpeg",
        "-re",                          # Real-time encoding
        "-f", "rawvideo",               # Input: raw video
        "-pixel_format", "rgb24",
        "-video_size", RESOLUTION,
        "-framerate", str(FRAME_RATE),
        "-i", "pipe:0",                 # Read from stdin
        "-c:v", codec,
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-f", "rtsp",
        "-rtsp_transport", "tcp",
        f"rtsp://localhost:{RTSP_PORT}/stream/{stream_id}",
        "-loglevel", "error",
    ]

    process = await asyncio.create_subprocess_exec(
        *ffmpeg_cmd,
        stdin=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )

    frame_num = 0
    frame_duration = 1.0 / FRAME_RATE

    while True:
        try:
            start = time.monotonic()

            frame = generate_frame(camera, frame_num)
            frame_bytes = frame.tobytes()

            if process.stdin:
                process.stdin.write(frame_bytes)
                await process.stdin.drain()

            frame_num += 1

            # Maintain frame rate
            elapsed = time.monotonic() - start
            sleep_time = max(0, frame_duration - elapsed)
            await asyncio.sleep(sleep_time)

        except (BrokenPipeError, ConnectionResetError):
            # MediaMTX disconnected — restart
            process.kill()
            break
        except asyncio.CancelledError:
            process.kill()
            raise


async def main() -> None:
    """Start all camera streams and the HTTP API server."""
    import asyncio

    print(f"Starting {CAMERA_COUNT} synthetic RTSP streams...")
    print(f"RTSP: rtsp://localhost:{RTSP_PORT}/stream/{{id}}")
    print(f"HLS: http://localhost:{HLS_PORT}/live/stream/{{id}}/index.m3u8")

    # Start HTTP API server
    config = uvicorn.Config(app, host="0.0.0.0", port=API_PORT, log_level="warning")
    server = uvicorn.Server(config)

    # Start camera streams (run concurrently)
    tasks = [asyncio.create_task(stream_camera_frames(cam)) for cam in cameras_catalog]
    tasks.append(asyncio.create_task(server.serve()))

    await asyncio.gather(*tasks, return_exceptions=True)


if __name__ == "__main__":
    asyncio.run(main())
