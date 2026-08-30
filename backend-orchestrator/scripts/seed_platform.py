"""Comprehensive Platform Seeder — Seeds 50 Gujarat cameras, departments, officers, watchlists, and alerts."""

import asyncio
import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal, init_db
from app.core.security import get_password_hash, generate_section65b_hmac
from app.models.department import Department
from app.models.officer import Officer, OfficerRole
from app.models.camera import Camera, CameraStatus, CameraType
from app.models.watchlist import WatchlistEntry, WatchlistCategory
from app.models.alert import AlertIncident, AlertSeverity, AlertStatus, AlertType
from app.adapters.sentinel_feed_adapter import sentinel_feed_adapter


async def seed():
    sys.stdout.reconfigure(encoding='utf-8')
    print("=================================================================")
    print("[SENTINEL] SEEDING GUJARAT SURVEILLANCE PLATFORM BACKEND")
    print("=================================================================")

    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Seed State Departments
        print("[1/5] Seeding 5 Participating State Departments...")
        departments = [
            Department(id="POLICE", code="POLICE", name="Gujarat State Police & CID Crime", description="State law enforcement and highway patrol", jurisdiction_level="Statewide"),
            Department(id="TRANSPORT_RTO", code="TRANSPORT_RTO", name="Transport Department & RTO Gujarat", description="Commercial vehicle compliance & speed tracking", jurisdiction_level="Statewide"),
            Department(id="MUNICIPALITY_AMC", code="MUNICIPALITY_AMC", name="Ahmedabad Municipal Corporation (AMC)", description="Smart city urban surveillance", jurisdiction_level="Municipal"),
            Department(id="BORDER_SECURITY", code="BORDER_SECURITY", name="Coastal & Border Security Wing", description="Port perimeter and international border corridors", jurisdiction_level="Border Corridor"),
            Department(id="FOREST_WILDLIFE", code="FOREST_WILDLIFE", name="Forest & Wildlife Department (Gir/Saurashtra)", description="Eco-sensitive corridor surveillance", jurisdiction_level="Sanctuary Zones"),
        ]
        for dept in departments:
            await session.merge(dept)
        await session.commit()
        print("  ✓ Departments registered.")

        # 2. Seed Officers
        print("[2/5] Seeding Gujarat Police Officers...")
        officers = [
            Officer(
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
            ),
            Officer(
                id="OFF-GND-001",
                officer_id="ADMIN-GND-001",
                badge_number="GJ-POL-0001",
                full_name="DGP Cyber Command",
                rank="Director General of Police",
                district="Gandhinagar",
                station="State Cyber Command HQ",
                hashed_password=get_password_hash("Sentinel@2026"),
                role=OfficerRole.ADMIN,
                department_id="POLICE",
                is_active=True,
                is_on_duty=True
            ),
            Officer(
                id="OFF-SUR-108",
                officer_id="SUPER-SUR-108",
                badge_number="GJ-POL-1108",
                full_name="Superintendent V.M. Patel",
                rank="Deputy Commissioner of Police",
                district="Surat City",
                station="Crime Branch Surat",
                hashed_password=get_password_hash("Sentinel@2026"),
                role=OfficerRole.SUPERVISOR,
                department_id="POLICE",
                is_active=True,
                is_on_duty=True
            ),
            Officer(
                id="OFF-RAJ-019",
                officer_id="INVESTIGATOR-RAJ-019",
                badge_number="GJ-POL-9019",
                full_name="Sub-Inspector D.K. Solanki",
                rank="Sub-Inspector",
                district="Rajkot City",
                station="Malaviyanagar Police Station",
                hashed_password=get_password_hash("Sentinel@2026"),
                role=OfficerRole.INVESTIGATOR,
                department_id="POLICE",
                is_active=True,
                is_on_duty=True
            ),
        ]
        for off in officers:
            await session.merge(off)
        await session.commit()
        print("  ✓ 4 Police Officers seeded.")

        # 3. Seed 50 Gujarat Cameras
        print("[3/5] Seeding 50 Official Gujarat Sentinel Cameras...")
        cameras_data = sentinel_feed_adapter.get_preconfigured_50_cameras()
        for c in cameras_data:
            camera = Camera(
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
                department_id=c.get("department_id"),
            )
            await session.merge(camera)
        await session.commit()
        print("  ✓ 50 Cameras registered with PostGIS coordinates and stream URLs.")

        # 4. Seed Crime Watchlists (eGujCop & VAHAN)
        print("[4/5] Seeding Crime Hotlist Watchlists...")
        watchlists = [
            WatchlistEntry(
                id="WCH-01",
                category=WatchlistCategory.STOLEN_VEHICLE,
                identifier="GJ01AB1234",
                clean_identifier="GJ01AB1234",
                reason="Stolen Black Toyota Fortuner - Reported under FIR 881/2026",
                case_number="FIR-2026-CR-0881",
                police_station="Navrangpura Police Station, Ahmedabad",
                investigating_officer="Inspector R.K. Jadeja",
                priority="CRITICAL",
                source_database="eGujCop",
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
            WatchlistEntry(
                id="WCH-02",
                category=WatchlistCategory.WANTED_SUSPECT,
                identifier="GJ05CD5678",
                clean_identifier="GJ05CD5678",
                reason="Wanted Criminal Vehicle - Inter-State Diamond Theft Ring",
                case_number="FIR-2026-CR-0412",
                police_station="Varachha Police Station, Surat",
                investigating_officer="DCP V.M. Patel",
                priority="CRITICAL",
                source_database="eGujCop",
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
            WatchlistEntry(
                id="WCH-03",
                category=WatchlistCategory.HIT_AND_RUN,
                identifier="GJ06XY9999",
                clean_identifier="GJ06XY9999",
                reason="Fatal Hit and Run Incident on NH-48 Express Highway",
                case_number="FIR-2026-TR-0199",
                police_station="Varnama Police Station, Vadodara",
                investigating_officer="SI S.N. Rathod",
                priority="HIGH",
                source_database="VAHAN",
                is_active=True,
                created_at=datetime.now(timezone.utc),
            ),
        ]
        for w in watchlists:
            await session.merge(w)
        await session.commit()
        print("  ✓ 3 Crime Watchlists seeded.")

        # 5. Seed Initial APB Threat Alerts
        print("[5/5] Seeding Initial APB Threat Incidents...")
        now = datetime.now(timezone.utc)
        alerts = [
            AlertIncident(
                id="INC-001",
                incident_number="APB-2026-08842",
                alert_type=AlertType.STOLEN_VEHICLE,
                severity=AlertSeverity.CRITICAL,
                status=AlertStatus.NEW,
                title="🚨 CRITICAL APB: Stolen Black Fortuner (GJ01AB1234) Detected",
                description="Hotlist vehicle identified crossing SG Highway Junction Cam-01 heading towards State Highway 8. PCR Patrol Unit 14 dispatched.",
                camera_id="1",
                camera_name="SG Highway — Prahladnagar Junction",
                district="Ahmedabad City",
                station="Navrangpura Police Station",
                latitude=23.0125,
                longitude=72.5085,
                detected_plate="GJ01AB1234",
                vehicle_make="Toyota",
                vehicle_model="Fortuner",
                vehicle_color="Black",
                confidence_score=0.992,
                fir_number="FIR-2026-CR-0881",
                watchlist_tag="eGujCop Hotlist",
                section65b_hmac_hash=generate_section65b_hmac("APB-2026-08842", "1", now.isoformat(), "GJ01AB1234", "SYSTEM", {}),
                created_at=now - timedelta(minutes=12),
            ),
            AlertIncident(
                id="INC-002",
                incident_number="APB-2026-04120",
                alert_type=AlertType.WANTED_SUSPECT,
                severity=AlertSeverity.HIGH,
                status=AlertStatus.INVESTIGATING,
                title="⚠️ SUSPECT TRANSIT: Silver Creta (GJ05CD5678) Sighted",
                description="Wanted diamond theft suspect vehicle detected at Surat Textile Market Checkpoint. Under active pursuit.",
                camera_id="15",
                camera_name="Ring Road — Textile Market Checkpoint",
                district="Surat City",
                station="Salabatpura Police Station",
                latitude=21.1925,
                longitude=72.8450,
                detected_plate="GJ05CD5678",
                vehicle_make="Hyundai",
                vehicle_model="Creta",
                vehicle_color="Silver",
                confidence_score=0.984,
                fir_number="FIR-2026-CR-0412",
                watchlist_tag="Crime Branch Hotlist",
                assigned_officer="DCP V.M. Patel",
                acknowledged_by="SUPER-SUR-108",
                acknowledged_at=now - timedelta(minutes=25),
                section65b_hmac_hash=generate_section65b_hmac("APB-2026-04120", "15", now.isoformat(), "GJ05CD5678", "SUPER-SUR-108", {}),
                created_at=now - timedelta(minutes=38),
            )
        ]
        for a in alerts:
            await session.merge(a)
        await session.commit()
        print("  ✓ APB Threat Alerts seeded.")

    print("\n=================================================================")
    print("✨ PLATFORM SEEDING COMPLETE! ALL 50 CAMERAS & SERVICES READY.")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(seed())
