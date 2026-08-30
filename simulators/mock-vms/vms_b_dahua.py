"""
Gujarat Sentinel — Mock VMS Server B (Dahua DSS Simulator)

Simulates a Dahua DSS (Digital Surveillance System) exposing REST API endpoints.
Returns real structured responses matching Dahua DSS protocol format.
Used by Model 3's DahuaAdapter for camera discovery, PTZ, and snapshot.
"""

from __future__ import annotations

import io
import random
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

app = FastAPI(title="Mock VMS B — Dahua DSS Simulator", version="1.0.0")

DEVICES = [
    {
        "id": "D001",
        "name": "Surat Ring Road IPC-01",
        "channels": [
            {"id": "1", "name": "Main Stream", "resolution": "1920x1080"},
            {"id": "2", "name": "Sub Stream", "resolution": "704x576"},
        ],
        "online": True,
        "ptzSupported": True,
        "model": "DH-IPC-HFW5442T-ZE",
    },
    {
        "id": "D002",
        "name": "Surat Textile Market IPC-02",
        "channels": [{"id": "1", "name": "Main Stream", "resolution": "2560x1440"}],
        "online": True,
        "ptzSupported": False,
        "model": "DH-IPC-HFW3441T-ZAS",
    },
    {
        "id": "D003",
        "name": "Surat Diamond Bourse IPC-03",
        "channels": [{"id": "1", "name": "Main Stream", "resolution": "3840x2160"}],
        "online": True,
        "ptzSupported": True,
        "model": "DH-SD6AL245XA-HNR",
    },
    {
        "id": "D004",
        "name": "Surat Station Road IPC-04",
        "channels": [
            {"id": "1", "name": "Main Stream", "resolution": "1920x1080"},
        ],
        "online": True,
        "ptzSupported": False,
        "model": "DH-IPC-HFW2441T-ZAS",
    },
    {
        "id": "D005",
        "name": "Surat Athwa Gate IPC-05",
        "channels": [{"id": "1", "name": "Main Stream", "resolution": "1920x1080"}],
        "online": True,
        "ptzSupported": True,
        "model": "DH-SD49425XB-HNR",
    },
    {
        "id": "D006",
        "name": "Surat Udhna IPC-06",
        "channels": [{"id": "1", "name": "Main Stream", "resolution": "2560x1440"}],
        "online": False,
        "ptzSupported": False,
        "model": "DH-IPC-HFW5442T-ZE",
    },
]


@app.get("/api/v1/system/info")
async def system_info():
    return {
        "systemInfo": {
            "deviceName": "Surat Smart City DSS",
            "deviceID": "DAHUA-DSS-SRT-001",
            "platform": "DSS Pro",
            "version": "8.2.0.0",
            "buildDate": "2024-06-15",
            "serialNumber": "6L0A8C3PAZ00042",
            "channelCount": sum(len(d["channels"]) for d in DEVICES),
            "deviceCount": len(DEVICES),
            "diskCount": 8,
            "diskCapacityTB": 48,
        }
    }


@app.get("/api/v1/devices")
async def list_devices():
    return {"devices": DEVICES, "total": len(DEVICES)}


@app.post("/api/v1/ptz/continuous")
async def ptz_continuous(request: Request):
    body = await request.json()
    return {
        "result": True,
        "channel": body.get("channel"),
        "action": body.get("action"),
        "speed": body.get("speed"),
    }


@app.post("/api/v1/ptz/preset/goto")
async def ptz_preset_goto(request: Request):
    body = await request.json()
    return {"result": True, "channel": body.get("channel"), "preset": body.get("preset")}


@app.get("/api/v1/snapshot")
async def get_snapshot(channel: int = 1):
    """Generate a real JPEG snapshot with Dahua-style overlay."""
    try:
        from PIL import Image, ImageDraw

        img = Image.new("RGB", (640, 480), color=(20, 25, 35))
        draw = ImageDraw.Draw(img)

        device = DEVICES[0] if DEVICES else {"name": f"Channel {channel}"}
        ts = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        draw.text((10, 10), f"DAHUA | {device['name']}", fill=(255, 255, 255))
        draw.text((10, 30), ts, fill=(200, 200, 200))
        draw.text((10, 450), f"CH{channel:02d} | DSS Pro 8.2", fill=(150, 150, 150))

        for _ in range(3):
            x1, y1 = random.randint(50, 590), random.randint(80, 430)
            x2, y2 = x1 + random.randint(30, 80), y1 + random.randint(20, 50)
            draw.rectangle([x1, y1, x2, y2], outline=(0, 200, 255), width=1)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return Response(content=buf.getvalue(), media_type="image/jpeg")
    except ImportError:
        return Response(content=b"\xff\xd8\xff\xe0", media_type="image/jpeg")


@app.get("/health")
async def health():
    online = sum(1 for d in DEVICES if d["online"])
    return {"status": "healthy", "service": "mock-vms-b-dahua", "devices": len(DEVICES), "online": online}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002)
