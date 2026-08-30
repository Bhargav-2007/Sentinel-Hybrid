"""Pytest configuration and async fixtures for Sentinel test suite."""

import sys
import os
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash
from app.models.officer import Officer, OfficerRole
from app.models.department import Department
from app.models.camera import Camera, CameraStatus, CameraType
from app.models.watchlist import WatchlistEntry, WatchlistCategory
from app.models.alert import AlertIncident, AlertSeverity, AlertStatus, AlertType
from app.adapters.sentinel_feed_adapter import sentinel_feed_adapter

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Initializes schema and seeds test data in memory."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        # Seed test department
        dept = Department(id="POLICE", code="POLICE", name="Gujarat Police", jurisdiction_level="Statewide")
        session.add(dept)

        # Seed test officer
        officer = Officer(
            id="OFF-AHM-042",
            officer_id="POLICE-AHM-042",
            badge_number="GJ-POL-8842",
            full_name="Inspector R.K. Jadeja",
            rank="Police Inspector",
            district="Ahmedabad City",
            station="Navrangpura Police Station",
            hashed_password=get_password_hash("Sentinel@2026"),
            role=OfficerRole.DUTY_OFFICER,
            department_id="POLICE",
            is_active=True,
            is_on_duty=True
        )
        session.add(officer)

        # Seed 50 cameras
        for c in sentinel_feed_adapter.get_preconfigured_50_cameras():
            cam = Camera(
                id=c["id"],
                stream_id=c["stream_id"],
                camera_code=c["camera_code"],
                name=c["name"],
                location_name=c["location_name"],
                district=c["district"],
                station=c["station"],
                latitude=c["latitude"],
                longitude=c["longitude"],
                camera_type=CameraType(c["camera_type"]),
                vms_vendor=c["vms_vendor"],
                rtsp_url=c["rtsp_url"],
                webrtc_url=c["webrtc_url"],
                hls_url=c["hls_url"],
                codec=c["codec"],
                fps=c["fps"],
                resolution=c["resolution"],
                bitrate_kbps=c["bitrate_kbps"],
                status=CameraStatus.ONLINE,
                is_live=True,
                department_id="POLICE",
            )
            session.add(cam)

        # Seed Watchlist
        w = WatchlistEntry(
            id="WCH-01",
            category=WatchlistCategory.STOLEN_VEHICLE,
            identifier="GJ01AB1234",
            clean_identifier="GJ01AB1234",
            reason="Stolen Black Fortuner",
            case_number="FIR-2026-CR-0881",
            priority="CRITICAL",
            source_database="eGujCop",
            is_active=True
        )
        session.add(w)

        # Seed Alert
        from datetime import datetime, timezone
        a = AlertIncident(
            id="INC-001",
            incident_number="APB-2026-08842",
            alert_type=AlertType.STOLEN_VEHICLE,
            severity=AlertSeverity.CRITICAL,
            status=AlertStatus.NEW,
            title="CRITICAL APB: Stolen Vehicle Detected",
            description="Vehicle identified crossing SG Highway Junction",
            camera_id="1",
            camera_name="SG Highway — Prahladnagar Junction",
            district="Ahmedabad City",
            station="Navrangpura Police Station",
            latitude=23.0125,
            longitude=72.5085,
            detected_plate="GJ01AB1234",
            confidence_score=0.99,
            created_at=datetime.now(timezone.utc)
        )
        session.add(a)
        await session.commit()

    # Override get_db dependency in FastAPI app
    async def override_get_db():
        async with TestSessionLocal() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
