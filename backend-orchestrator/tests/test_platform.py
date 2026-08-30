"""Comprehensive Unit & Integration Test Suite for Gujarat Sentinel Orchestrator Backend."""

import sys
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["service"] == "sentinel-orchestrator"
        assert "components" in data


@pytest.mark.asyncio
async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OPERATIONAL"
        assert len(data["models_integrated"]) == 4


@pytest.mark.asyncio
async def test_officer_login_and_me():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login with Officer Badge ID
        login_res = await ac.post("/api/v1/auth/login", json={
            "officer_id": "POLICE-AHM-042",
            "password": "Sentinel@2026"
        })
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]
        assert token_data["officer_id"] == "POLICE-AHM-042"

        # 2. Query /auth/me with Bearer token
        me_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        officer = me_res.json()
        assert officer["officer_id"] == "POLICE-AHM-042"
        assert officer["district"] == "Ahmedabad City"


@pytest.mark.asyncio
async def test_cameras_list_and_geojson():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List cameras
        cam_res = await ac.get("/api/v1/cameras?limit=50")
        assert cam_res.status_code == 200
        cameras = cam_res.json()
        assert len(cameras) >= 50
        assert any(c["district"] == "Ahmedabad City" for c in cameras)

        # 2. Query GeoJSON FeatureCollection
        geo_res = await ac.get("/api/v1/cameras/geojson")
        assert geo_res.status_code == 200
        geojson = geo_res.json()
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) >= 50
        assert geojson["features"][0]["geometry"]["type"] == "Point"


@pytest.mark.asyncio
async def test_alerts_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login first to get token
        login_res = await ac.post("/api/v1/auth/login", json={
            "officer_id": "POLICE-AHM-042",
            "password": "Sentinel@2026"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. List alerts
        alerts_res = await ac.get("/api/v1/alerts?limit=10", headers=headers)
        assert alerts_res.status_code == 200
        alerts = alerts_res.json()
        assert len(alerts) >= 1

        alert_id = alerts[0]["id"]

        # 2. Acknowledge alert
        ack_res = await ac.post(f"/api/v1/alerts/{alert_id}/acknowledge?notes=Acknowledged+by+patrol", headers=headers)
        assert ack_res.status_code == 200
        assert ack_res.json()["status"] == "ACKNOWLEDGED"

        # 3. Investigate alert
        inv_res = await ac.post(f"/api/v1/alerts/{alert_id}/investigate?notes=PCR+unit+en+route", headers=headers)
        assert inv_res.status_code == 200
        assert inv_res.json()["status"] == "INVESTIGATING"


@pytest.mark.asyncio
async def test_ai_orchestrator_detection_and_360():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Ingest Detection for Watchlist plate (GJ01AB1234)
        ingest_res = await ac.post("/api/v1/orchestrator/ingest-detection", json={
            "camera_id": "1",
            "camera_name": "SG Highway — Prahladnagar Junction",
            "district": "Ahmedabad City",
            "latitude": 23.0125,
            "longitude": 72.5085,
            "detected_plate": "GJ01AB1234",
            "confidence_score": 0.995,
            "vehicle_type": "CAR",
            "vehicle_make": "Toyota",
            "vehicle_model": "Fortuner",
            "vehicle_color": "Black",
            "pts_timestamp_ms": 142050
        })
        assert ingest_res.status_code == 200
        res_data = ingest_res.json()
        assert res_data["plate"] == "GJ01AB1234"
        assert res_data["is_watchlist_match"] is True
        assert res_data["alert_generated"] is True

        # 2. Correlate 360-degree vehicle intelligence
        profile_res = await ac.get("/api/v1/orchestrator/vehicle-360/GJ01AB1234")
        assert profile_res.status_code == 200
        profile = profile_res.json()
        assert profile["plate"] == "GJ01AB1234"
        assert profile["vahan_registration"]["blacklist_status"] == "BLACKLISTED"
        assert profile["watchlist_status"]["is_wanted"] is True


@pytest.mark.asyncio
async def test_cost_benefit_and_sizing_apis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Sizing Matrix (50 cameras)
        sizing_res = await ac.get("/api/v1/cost-benefit/sizing-matrix?camera_count=50")
        assert sizing_res.status_code == 200
        sizing = sizing_res.json()
        assert sizing["camera_count"] == 50
        assert sizing["bandwidth_profile"]["bandwidth_reduction_percentage"] > 99.0

        # 2. TCO Report
        tco_res = await ac.get("/api/v1/cost-benefit/tco-report?camera_count=50")
        assert tco_res.status_code == 200
        tco = tco_res.json()
        assert tco["financial_savings_summary"]["cost_reduction_percentage"] > 90.0

        # 3. Live Host Telemetry
        telemetry_res = await ac.get("/api/v1/cost-benefit/live-resource-telemetry")
        assert telemetry_res.status_code == 200
        assert "cpu_utilization_pct" in telemetry_res.json()


@pytest.mark.asyncio
async def test_section_65b_certificate_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "officer_id": "POLICE-AHM-042",
            "password": "Sentinel@2026"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        cert_res = await ac.get("/api/v1/audit/export-section65b/INC-001", headers=headers)
        assert cert_res.status_code == 200
        cert = cert_res.json()
        assert "CERTIFICATE UNDER SECTION 65B" in cert["title"]
        assert cert["evidence_reference"]["tamper_evidence_verified"] is True
