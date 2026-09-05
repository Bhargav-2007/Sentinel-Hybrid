"""
Gujarat Sentinel — Model 1: Dynamic Catalogue Sync Service
Synchronizes the official Sentinel sandbox camera catalogue (/api/ingest)
into the PostGIS Camera Registry. Zero hardcoded cameras.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List
import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import (
    Camera,
    CameraStatusEnum,
    CameraTypeEnum,
    CodecEnum,
    Department,
    ProtocolEnum,
    StorageTypeEnum,
)
from app.db.session import get_session_factory

logger = logging.getLogger("sentinel.model1.sync")

# Default department mapping
DEFAULT_DEPTS = [
    {"code": "POLICE", "name": "Gujarat Police Department"},
    {"code": "HEALTH", "name": "Department of Health & Family Welfare"},
    {"code": "GSRTC", "name": "Gujarat State Road Transport Corporation"},
    {"code": "PANCHAYAT", "name": "Panchayats, Rural Housing & Rural Dev"},
    {"code": "MUNICIPAL", "name": "Urban Development & Municipal Corporation"},
]


async def ensure_departments(session: AsyncSession) -> Dict[str, uuid.UUID]:
    """Ensures primary government departments exist and returns code -> UUID map."""
    dept_map: Dict[str, uuid.UUID] = {}
    for d in DEFAULT_DEPTS:
        stmt = select(Department).where(Department.code == d["code"])
        res = await session.execute(stmt)
        dept = res.scalars().first()
        if not dept:
            dept = Department(
                id=uuid.uuid4(),
                code=d["code"],
                name=d["name"],
                extra_metadata={"managed_by": "Sentinel Platform"},
            )
            session.add(dept)
            await session.flush()
        dept_map[d["code"]] = dept.id
    await session.commit()
    return dept_map


async def fetch_catalogue_from_sources() -> List[Dict[str, Any]]:
    """Fetches dynamic camera inventory from official Sentinel catalogue or RTSP simulator."""
    # Priority order: live official sandbox → Docker service → localhost variants
    sources = [
        "https://live.corp8.cloud/api/ingest",        # Official live sandbox (highest priority)
        "https://cctv.corp8.cloud/api/ingest",         # Alternative official endpoint
        "https://cctv.corp8.cloud/cameras.json",
        "http://rtsp-simulator:8888/api/ingest",       # Docker Compose service name
        "http://rtsp-simulator:8888/streams",
        "http://localhost:8888/api/ingest",            # Local dev (simulator on 8888)
        "http://127.0.0.1:8888/api/ingest",
        "http://localhost:8886/api/ingest",            # Host-mapped port from docker-compose
    ]
    for src in sources:
        try:
            async with httpx.AsyncClient(timeout=1.0, follow_redirects=True) as client:
                resp = await client.get(src)
                if resp.status_code == 200:
                    data = resp.json()
                    cameras = []
                    if isinstance(data, dict):
                        cameras = data.get("cameras") or data.get("streams") or data.get("items") or []
                    elif isinstance(data, list):
                        cameras = data
                    if cameras:
                        logger.info(f"Fetched {len(cameras)} streams from {src}")
                        return cameras
        except Exception as e:
            logger.debug(f"Catalogue fetch failed from {src}: {e}")
    return []



async def sync_catalogue_into_registry() -> int:
    """Synchronizes dynamic /api/ingest catalogue into PostGIS/DB."""
    catalogue = await fetch_catalogue_from_sources()
    if not catalogue:
        import os, sqlite3
        candidates = ["sentinel_platform.db", "../sentinel_platform.db"]
        db_file = next((p for p in candidates if os.path.exists(p)), None)
        if db_file:
            try:
                conn = sqlite3.connect(db_file)
                cur = conn.cursor()
                rows = cur.execute("SELECT id, stream_id, camera_code, name, district, latitude, longitude, rtsp_url, webrtc_url, hls_url FROM cameras").fetchall()
                for r in rows:
                    catalogue.append({
                        "id": str(r[0]),
                        "stream_id": str(r[1]),
                        "camera_id": str(r[2]),
                        "name": str(r[3]),
                        "location": {
                            "district": str(r[4]),
                            "latitude": float(r[5]),
                            "longitude": float(r[6]),
                            "address": f"{r[3]}, {r[4]}",
                        },
                        "rtsp_url": str(r[7]),
                        "webrtc_url": str(r[8]),
                        "hls_url": str(r[9]),
                        "live": True,
                    })
                logger.info(f"Loaded {len(catalogue)} fallback cameras from {db_file}")
            except Exception as e:
                logger.debug(f"Could not load fallback cameras: {e}")

    if not catalogue:
        logger.warning("No dynamic camera catalogue discovered.")
        return 0

    factory = get_session_factory()
    synced_count = 0

    async with factory() as session:
        dept_map = await ensure_departments(session)
        police_dept_id = dept_map.get("POLICE", list(dept_map.values())[0])

        for entry in catalogue:
            cam_num = str(entry.get("stream_id") or entry.get("id", "1")).replace("stream/", "")
            cid = entry.get("camera_id") or f"CAM-GUJ-{int(cam_num):02d}" if cam_num.isdigit() else f"CAM-GUJ-{cam_num}"
            name = entry.get("name") or f"Gujarat Surveillance Cam {cam_num}"
            
            loc = entry.get("location") or {}
            if isinstance(loc, dict):
                lat = float(loc.get("latitude") or 23.0225)
                lng = float(loc.get("longitude") or 72.5714)
                district = loc.get("district") or "Ahmedabad City"
                address = loc.get("address") or f"{name}, {district}"
            else:
                lat, lng = 23.0225, 72.5714
                district = "Ahmedabad City"
                address = str(loc)

            dept_code = str(entry.get("department", "POLICE")).upper()
            dept_id = dept_map.get(dept_code, police_dept_id)

            rtsp_url = entry.get("rtsp_url") or f"rtsp://103.250.160.189:8554/stream/cam{int(cam_num):02d}" if cam_num.isdigit() else f"rtsp://103.250.160.189:8554/stream/{cam_num}"
            codec_str = str(entry.get("codec", "h264")).lower()
            codec_val = CodecEnum.h265 if "265" in codec_str or "hevc" in codec_str else CodecEnum.h264
            cam_type_str = str(entry.get("camera_type", "bullet")).lower()
            cam_type_val = CameraTypeEnum.ptz if "ptz" in cam_type_str else CameraTypeEnum.bullet

            is_live = bool(entry.get("live", True))
            status_val = CameraStatusEnum.online if is_live else CameraStatusEnum.offline

            # Check if camera exists
            stmt = select(Camera).where(Camera.camera_id == cid)
            res = await session.execute(stmt)
            cam = res.scalars().first()

            location_wkt = f"SRID=4326;POINT({lng} {lat})"

            if not cam:
                cam = Camera(
                    id=uuid.uuid4(),
                    camera_id=cid,
                    department_id=dept_id,
                    name=name,
                    location=location_wkt,
                    latitude=lat,
                    longitude=lng,
                    address=address,
                    district=district,
                    camera_type=cam_type_val,
                    protocol=ProtocolEnum.rtsp,
                    codec=codec_val,
                    resolution=entry.get("resolution", "1920x1080"),
                    frame_rate=entry.get("frame_rate", 25),
                    rtsp_url=rtsp_url,
                    storage_type=StorageTypeEnum.edge_device,
                    status=status_val,
                    extra_metadata={
                        "stream_id": cam_num,
                        "webrtc_url": entry.get("webrtc_url"),
                        "hls_url": entry.get("hls_url"),
                        "public_domain": entry.get("is_public_domain", True),
                    },
                )
                session.add(cam)
            else:
                cam.name = name
                cam.latitude = lat
                cam.longitude = lng
                cam.location = location_wkt
                cam.address = address
                cam.district = district
                cam.rtsp_url = rtsp_url
                cam.status = status_val
                cam.extra_metadata = {
                    **dict(cam.extra_metadata or {}),
                    "stream_id": cam_num,
                    "webrtc_url": entry.get("webrtc_url"),
                    "hls_url": entry.get("hls_url"),
                }

            synced_count += 1

        await session.commit()
        logger.info(f"✓ Model 1 Registry synced {synced_count} cameras from catalogue.")

    return synced_count
