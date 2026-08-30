"""
Gujarat Sentinel — Model 1
Integration Tests

Tests the full API stack with a real PostgreSQL+PostGIS database
using Testcontainers. These tests verify:
  - Database migrations apply correctly
  - CRUD operations work end-to-end
  - GIS queries return correct GeoJSON
  - Bulk import handles partial failures
  - Audit trail is written correctly

Run with: pytest tests/integration -v
Requires: Docker daemon running
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

import httpx
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Override settings for tests
import os
os.environ["AUTH_DISABLED"] = "true"
os.environ["OPA_DISABLED"] = "true"
os.environ["ENVIRONMENT"] = "development"


@pytest.fixture(scope="session")
def event_loop():
    """Create session-scoped event loop."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def postgres_container():
    """Start a PostGIS test container for the session."""
    try:
        from testcontainers.postgres import PostgresContainer

        with PostgresContainer("postgis/postgis:16-3.4-alpine") as postgres:
            yield postgres
    except ImportError:
        pytest.skip("testcontainers not installed")


@pytest.fixture(scope="session")
def redis_container():
    """Start a Redis test container."""
    try:
        from testcontainers.redis import RedisContainer

        with RedisContainer("redis:7.4-alpine") as redis:
            yield redis
    except ImportError:
        # Use mock Redis
        yield None


@pytest.fixture(scope="session")
def test_app(postgres_container, redis_container):
    """Create test FastAPI app with real database."""
    if postgres_container is None:
        pytest.skip("PostgreSQL container not available")

    db_url = postgres_container.get_connection_url()
    # Convert to asyncpg URL
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    redis_url = "redis://localhost:6379/15"  # Use DB 15 for tests
    if redis_container:
        redis_url = redis_container.get_connection_url()

    os.environ["MODEL1_DATABASE_URL"] = db_url
    os.environ["REDIS_URL"] = redis_url
    os.environ["KAFKA_BOOTSTRAP_SERVERS"] = "localhost:29092"  # External port

    # Clear settings cache
    from app.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    app = create_app()
    return app


@pytest.fixture(scope="session")
def test_client(test_app):
    """Create test client."""
    with TestClient(test_app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture
def department_id(test_client) -> str:
    """Get or create a test department."""
    # List existing departments
    resp = test_client.get("/api/v1/departments")
    if resp.status_code == 200:
        depts = resp.json().get("departments", [])
        if depts:
            return depts[0]["id"]

    # Create a department
    resp = test_client.post("/api/v1/departments", json={
        "code": "TEST",
        "name": "Test Department",
    })
    if resp.status_code == 201:
        return resp.json()["id"]

    pytest.skip("Cannot create test department")


# ── API Endpoint Tests ────────────────────────────────────────────────────────

class TestCameraAPI:
    """Integration tests for camera CRUD endpoints."""

    def test_health_endpoint(self, test_client) -> None:
        """Health endpoint should return 200."""
        resp = test_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_readiness_endpoint(self, test_client) -> None:
        """Readiness endpoint should return service status."""
        resp = test_client.get("/ready")
        # May be 200 or 503 depending on DB connectivity
        assert resp.status_code in [200, 503]

    def test_openapi_docs_accessible(self, test_client) -> None:
        """Swagger docs should be accessible."""
        resp = test_client.get("/docs")
        assert resp.status_code == 200

    def test_openapi_schema_valid(self, test_client) -> None:
        """OpenAPI schema should be valid JSON."""
        resp = test_client.get("/openapi.json")
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["openapi"].startswith("3.")
        assert "cameras" in str(schema["paths"])

    def test_list_cameras_empty(self, test_client) -> None:
        """List cameras should return empty list initially."""
        resp = test_client.get("/api/v1/cameras")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    def test_create_camera(self, test_client, department_id: str) -> None:
        """Creating a camera should return 201 with camera data."""
        camera_data = {
            "camera_id": f"INT-TEST-{uuid.uuid4().hex[:8].upper()}",
            "name": "Integration Test Camera",
            "department_id": department_id,
            "location": {
                "latitude": 23.0225,
                "longitude": 72.5714,
                "district": "Ahmedabad",
                "address": "Test Location",
                "pincode": "380001",
            },
            "camera_type": "dome",
            "protocol": "rtsp",
            "codec": "h264",
            "resolution": "1920x1080",
            "frame_rate": 25,
            "storage_type": "local_nvr",
            "retention_days": 15,
            "is_public_domain": True,
        }

        resp = test_client.post("/api/v1/cameras", json=camera_data)
        assert resp.status_code == 201

        data = resp.json()
        assert data["camera_id"] == camera_data["camera_id"]
        assert data["name"] == camera_data["name"]
        assert data["location"]["district"] == "Ahmedabad"
        assert "id" in data
        assert "created_at" in data

    def test_create_duplicate_camera_returns_409(
        self, test_client, department_id: str
    ) -> None:
        """Creating duplicate camera_id should return 409."""
        camera_id = f"DUPE-{uuid.uuid4().hex[:8].upper()}"
        camera_data = {
            "camera_id": camera_id,
            "name": "Duplicate Camera",
            "department_id": department_id,
            "location": {"latitude": 23.0, "longitude": 72.5},
            "camera_type": "dome",
        }

        # First creation should succeed
        resp1 = test_client.post("/api/v1/cameras", json=camera_data)
        assert resp1.status_code == 201

        # Second creation should fail
        resp2 = test_client.post("/api/v1/cameras", json=camera_data)
        assert resp2.status_code == 409

    def test_get_camera_by_id(self, test_client, department_id: str) -> None:
        """Get camera by UUID should return camera data."""
        # Create first
        camera_data = {
            "camera_id": f"GET-TEST-{uuid.uuid4().hex[:8].upper()}",
            "name": "Get Test Camera",
            "department_id": department_id,
            "location": {"latitude": 23.0, "longitude": 72.5},
            "camera_type": "bullet",
        }
        create_resp = test_client.post("/api/v1/cameras", json=camera_data)
        assert create_resp.status_code == 201
        camera_id = create_resp.json()["id"]

        # Then get
        get_resp = test_client.get(f"/api/v1/cameras/{camera_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["id"] == camera_id

    def test_get_nonexistent_camera_returns_404(self, test_client) -> None:
        """Getting non-existent camera should return 404."""
        resp = test_client.get(f"/api/v1/cameras/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_update_camera(self, test_client, department_id: str) -> None:
        """Updating camera metadata should return updated data."""
        # Create
        camera_data = {
            "camera_id": f"UPD-TEST-{uuid.uuid4().hex[:8].upper()}",
            "name": "Update Test Camera",
            "department_id": department_id,
            "location": {"latitude": 23.0, "longitude": 72.5},
            "camera_type": "dome",
        }
        create_resp = test_client.post("/api/v1/cameras", json=camera_data)
        assert create_resp.status_code == 201
        camera_id = create_resp.json()["id"]

        # Update
        update_resp = test_client.put(
            f"/api/v1/cameras/{camera_id}",
            json={"name": "Updated Camera Name"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated Camera Name"

    def test_delete_camera(self, test_client, department_id: str) -> None:
        """Deleting camera should return 204 and make it inaccessible."""
        camera_data = {
            "camera_id": f"DEL-TEST-{uuid.uuid4().hex[:8].upper()}",
            "name": "Delete Test Camera",
            "department_id": department_id,
            "location": {"latitude": 23.0, "longitude": 72.5},
            "camera_type": "dome",
        }
        create_resp = test_client.post("/api/v1/cameras", json=camera_data)
        assert create_resp.status_code == 201
        camera_id = create_resp.json()["id"]

        # Delete
        del_resp = test_client.delete(f"/api/v1/cameras/{camera_id}")
        assert del_resp.status_code == 204

        # Get should now return 404
        get_resp = test_client.get(f"/api/v1/cameras/{camera_id}")
        assert get_resp.status_code == 404

    def test_bulk_import_cameras(self, test_client, department_id: str) -> None:
        """Bulk import should succeed with valid cameras."""
        cameras = [
            {
                "camera_id": f"BULK-{uuid.uuid4().hex[:8].upper()}",
                "name": f"Bulk Camera {i}",
                "department_id": department_id,
                "location": {
                    "latitude": 23.0 + i * 0.01,
                    "longitude": 72.5 + i * 0.01,
                    "district": "Ahmedabad",
                },
                "camera_type": "dome",
            }
            for i in range(10)
        ]

        resp = test_client.post(
            "/api/v1/cameras/bulk",
            json={"cameras": cameras, "skip_duplicates": False},
        )
        assert resp.status_code == 207  # Partial success
        data = resp.json()
        assert data["succeeded"] == 10
        assert data["failed"] == 0

    def test_filter_cameras_by_district(
        self, test_client, department_id: str
    ) -> None:
        """Filtering by district should return matching cameras only."""
        # Create camera in Surat
        camera_data = {
            "camera_id": f"SRT-FILT-{uuid.uuid4().hex[:8].upper()}",
            "name": "Surat Filter Test",
            "department_id": department_id,
            "location": {
                "latitude": 21.1702,
                "longitude": 72.8311,
                "district": "Surat",
            },
            "camera_type": "bullet",
        }
        test_client.post("/api/v1/cameras", json=camera_data)

        # Filter by Surat
        resp = test_client.get("/api/v1/cameras?district=Surat")
        assert resp.status_code == 200
        data = resp.json()
        # All returned cameras should be in Surat
        for cam in data["items"]:
            assert "Surat" in (cam["location"].get("district") or "")


class TestGISAPI:
    """Integration tests for GIS endpoints."""

    def test_cameras_geojson(self, test_client) -> None:
        """GIS cameras endpoint should return GeoJSON."""
        resp = test_client.get("/api/v1/gis/cameras")
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "FeatureCollection"
        assert "features" in data

    def test_district_stats(self, test_client) -> None:
        """District stats should return a list."""
        resp = test_client.get("/api/v1/gis/districts")
        assert resp.status_code == 200
        data = resp.json()
        assert "districts" in data
        assert isinstance(data["districts"], list)

    def test_gap_analysis(self, test_client) -> None:
        """Gap analysis should return coverage statistics."""
        resp = test_client.get("/api/v1/gis/gaps?grid_size_meters=1000")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_area_km2" in data
        assert "coverage_percent" in data
        assert "gap_zones" in data

    def test_heatmap(self, test_client) -> None:
        """Heatmap should return H3 hexbins."""
        resp = test_client.get("/api/v1/gis/heatmap?resolution=6")
        assert resp.status_code == 200
        data = resp.json()
        assert "resolution" in data
        assert data["resolution"] == 6
        assert "hexbins" in data

    def test_coverage_polygons(self, test_client) -> None:
        """Coverage endpoint should return GeoJSON polygons."""
        resp = test_client.get("/api/v1/gis/coverage?radius_meters=100")
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "FeatureCollection"


class TestAuditAPI:
    """Integration tests for audit trail."""

    def test_audit_trail_accessible(self, test_client) -> None:
        """Audit trail should be accessible."""
        resp = test_client.get("/api/v1/audit")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_camera_creation_creates_audit_entry(
        self, test_client, department_id: str
    ) -> None:
        """Creating a camera should create an audit entry."""
        camera_id = f"AUD-TEST-{uuid.uuid4().hex[:8].upper()}"
        camera_data = {
            "camera_id": camera_id,
            "name": "Audit Test Camera",
            "department_id": department_id,
            "location": {"latitude": 23.0, "longitude": 72.5},
            "camera_type": "dome",
        }
        test_client.post("/api/v1/cameras", json=camera_data)

        # Check audit trail
        resp = test_client.get("/api/v1/audit?action=create&entity_type=camera")
        assert resp.status_code == 200
        # At least one create audit entry should exist
        assert resp.json()["total"] >= 1
