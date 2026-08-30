"""
Gujarat Sentinel — Mock VMS Server A (Hikvision ISAPI Simulator)

Simulates a Hikvision NVR exposing ISAPI endpoints.
Returns real structured responses matching ISAPI protocol format.
Used by Model 3's HikvisionAdapter for camera discovery, PTZ, and snapshot.
"""

from __future__ import annotations

import io
import random
import struct
from datetime import datetime, timezone

import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

app = FastAPI(title="Mock VMS A — Hikvision ISAPI Simulator", version="1.0.0")

# ── Camera inventory for this NVR ─────────────────────────────────────────────
CAMERAS = [
    {"id": "1", "name": "Ahmedabad SG Highway Cam-01", "resolution": "1920x1080", "ptz": True},
    {"id": "2", "name": "Ahmedabad Ashram Road Cam-02", "resolution": "1920x1080", "ptz": True},
    {"id": "3", "name": "Ahmedabad CG Road Cam-03", "resolution": "2560x1440", "ptz": False},
    {"id": "4", "name": "Ahmedabad Law Garden Cam-04", "resolution": "1920x1080", "ptz": True},
    {"id": "5", "name": "Ahmedabad Riverfront Cam-05", "resolution": "3840x2160", "ptz": True},
    {"id": "6", "name": "Ahmedabad Satellite Cam-06", "resolution": "1920x1080", "ptz": False},
    {"id": "7", "name": "Ahmedabad Navrangpura Cam-07", "resolution": "1920x1080", "ptz": True},
    {"id": "8", "name": "Ahmedabad Maninagar Cam-08", "resolution": "2560x1440", "ptz": False},
]


@app.get("/ISAPI/System/deviceInfo")
async def device_info():
    return {
        "DeviceInfo": {
            "deviceName": "Ahmedabad Police HQ NVR-01",
            "deviceID": "HIK-NVR-AHM-001",
            "model": "DS-9664NI-I8",
            "serialNumber": "DS-9664NI-I820220715CCRRJ12345678",
            "macAddress": "c0:56:e3:aa:bb:cc",
            "firmwareVersion": "V4.62.000 build 220701",
            "firmwareReleasedDate": "2022-07-01",
            "encoderVersion": "V5.0 build 180820",
            "encoderReleasedDate": "2018-08-20",
            "deviceType": "NVR",
            "telecontrolID": 255,
            "supportBeep": True,
            "supportVideoLoss": True,
            "channelCount": len(CAMERAS),
        }
    }


@app.get("/ISAPI/System/Video/inputs/channels")
async def list_channels():
    channels = []
    for cam in CAMERAS:
        channels.append({
            "id": cam["id"],
            "channelId": cam["id"],
            "channelName": cam["name"],
            "name": cam["name"],
            "online": True,
            "resolution": cam["resolution"],
            "ptzSupported": cam["ptz"],
            "videoCodecType": "H.264",
            "streamType": "main",
            "enabled": True,
            "inputPort": int(cam["id"]),
        })
    return {"channels": channels, "VideoInputChannelList": channels}


@app.put("/ISAPI/PTZCtrl/channels/{channel}/continuous")
async def ptz_continuous(channel: int, request: Request):
    body = await request.json()
    return {
        "statusCode": 1,
        "statusString": "OK",
        "channel": channel,
        "panSpeed": body.get("panSpeed", 0),
        "tiltSpeed": body.get("tiltSpeed", 0),
        "zoomSpeed": body.get("zoomSpeed", 0),
    }


@app.put("/ISAPI/PTZCtrl/channels/{channel}/presets/{preset}/goto")
async def ptz_preset_goto(channel: int, preset: int):
    return {"statusCode": 1, "statusString": "OK", "channel": channel, "preset": preset}


@app.get("/ISAPI/Streaming/channels/{channel}01/picture")
async def get_snapshot(channel: int):
    """Generate a real JPEG snapshot with timestamp overlay."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.new("RGB", (640, 480), color=(30, 30, 40))
        draw = ImageDraw.Draw(img)

        cam_name = CAMERAS[channel - 1]["name"] if channel <= len(CAMERAS) else f"Camera {channel}"
        ts = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        draw.text((10, 10), f"HIKVISION | {cam_name}", fill=(255, 255, 255))
        draw.text((10, 30), ts, fill=(200, 200, 200))
        draw.text((10, 450), f"CH{channel:02d} | 1920x1080 | H.264", fill=(150, 150, 150))

        # Simulated activity lines
        for _ in range(5):
            x1, y1 = random.randint(50, 590), random.randint(80, 430)
            x2, y2 = x1 + random.randint(20, 100), y1 + random.randint(20, 60)
            draw.rectangle([x1, y1, x2, y2], outline=(0, 255, 0), width=1)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return Response(content=buf.getvalue(), media_type="image/jpeg")
    except ImportError:
        return Response(content=b"\xff\xd8\xff\xe0", media_type="image/jpeg")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "mock-vms-a-hikvision", "cameras": len(CAMERAS)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001)
