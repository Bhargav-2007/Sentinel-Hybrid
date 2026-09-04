"""Unit and Integration Test Suite for AI Detection & ANPR FastAPI Service."""

import sys
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app


@pytest.mark.asyncio
async def test_health_check_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "gpu_available" in data
        assert "person" in data["supported_classes"]
        assert "car" in data["supported_classes"]


@pytest.mark.asyncio
async def test_root_index_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OPERATIONAL"
        assert "/detect/full" in data["endpoints"]["full_pipeline"]


@pytest.mark.asyncio
async def test_person_vehicle_detection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Test with empty payload (triggers blank frame)
        res = await ac.post("/detect/person-vehicle", json={
            "camera_id": "cam_sg_highway_01",
            "return_annotated_image": True,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["camera_id"] == "cam_sg_highway_01"
        assert data["inference_time_ms"] >= 0.0
        assert isinstance(data["detections"], list)


@pytest.mark.asyncio
async def test_anpr_license_plate_detection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/detect/anpr", json={
            "camera_id": "cam_surat_ring_02",
            "return_annotated_image": True,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["total_plates_detected"] >= 0
        assert isinstance(data["plates"], list)


@pytest.mark.asyncio
async def test_full_detection_pipeline():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/detect/full", json={
            "camera_id": "stream_1",
            "return_annotated_image": True,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "counts" in data
        assert isinstance(data["people_and_vehicles"], list)
        assert isinstance(data["license_plates"], list)


@pytest.mark.asyncio
async def test_stream_process_frame_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/stream/process-frame", json={
            "stream_url": "rtsp://live.corp8.cloud:8554/stream/1",
            "camera_id": "stream_1",
            "detect_plates": True,
            "track_objects": True,
            "return_annotated_frame": True,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["camera_id"] == "stream_1"
