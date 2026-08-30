"""Vehicle Trajectory Tracking & PTS Speed Estimation Service."""

import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.models.trajectory import VehicleTrajectory, VehicleEncounter
from app.models.camera import Camera

logger = logging.getLogger("sentinel.services.tracking")


class TrackingService:
    """Manages multi-camera vehicle route history, encounter logs, and PTS speed calculations."""

    async def record_encounter(
        self,
        db: AsyncSession,
        plate: str,
        camera_id: str,
        latitude: float,
        longitude: float,
        confidence: float = 0.98,
        pts_timestamp_ms: Optional[int] = None,
        snapshot_url: Optional[str] = None,
    ) -> VehicleEncounter:
        """Records a new sighting checkpoint and updates the continuous trajectory path."""
        clean_plate = plate.strip().upper().replace(" ", "").replace("-", "")
        now = datetime.now(timezone.utc)

        # 1. Fetch or initialize trajectory
        stmt = select(VehicleTrajectory).where(VehicleTrajectory.clean_plate == clean_plate)
        res = await db.execute(stmt)
        trajectory = res.scalars().first()

        estimated_speed_kmh = None

        if not trajectory:
            trajectory = VehicleTrajectory(
                id=f"TRJ-{uuid.uuid4().hex[:10].upper()}",
                plate=plate.upper(),
                clean_plate=clean_plate,
                first_seen_at=now,
                last_seen_at=now,
                total_sightings=1,
                last_camera_id=camera_id,
                last_latitude=latitude,
                last_longitude=longitude,
                path_geojson=[{
                    "camera_id": camera_id,
                    "latitude": latitude,
                    "longitude": longitude,
                    "sighted_at": now.isoformat(),
                    "pts_ms": pts_timestamp_ms,
                }],
            )
            db.add(trajectory)
            await db.commit()
            await db.refresh(trajectory)
        else:
            # Calculate speed between previous checkpoint and current encounter using PTS delta
            if trajectory.last_latitude and trajectory.last_longitude and trajectory.last_seen_at:
                dlat = math.radians(latitude - trajectory.last_latitude)
                dlng = math.radians(longitude - trajectory.last_longitude)
                a = math.sin(dlat / 2)**2 + math.cos(math.radians(trajectory.last_latitude)) * math.cos(math.radians(latitude)) * math.sin(dlng / 2)**2
                dist_km = 6371.0 * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
                
                time_delta_hours = max((now - trajectory.last_seen_at).total_seconds() / 3600.0, 0.001)
                calculated_speed = dist_km / time_delta_hours
                if 5.0 <= calculated_speed <= 180.0:
                    estimated_speed_kmh = round(calculated_speed, 1)

            # Update trajectory
            trajectory.last_seen_at = now
            trajectory.total_sightings += 1
            trajectory.last_camera_id = camera_id
            trajectory.last_latitude = latitude
            trajectory.last_longitude = longitude
            
            # Append to GeoJSON path
            path = list(trajectory.path_geojson or [])
            path.append({
                "camera_id": camera_id,
                "latitude": latitude,
                "longitude": longitude,
                "sighted_at": now.isoformat(),
                "pts_ms": pts_timestamp_ms,
                "speed_kmh": estimated_speed_kmh,
            })
            trajectory.path_geojson = path
            await db.commit()

        # 2. Add checkpoint encounter record
        encounter = VehicleEncounter(
            id=f"ENC-{uuid.uuid4().hex[:10].upper()}",
            trajectory_id=trajectory.id,
            camera_id=camera_id,
            latitude=latitude,
            longitude=longitude,
            speed_kmh=estimated_speed_kmh,
            confidence=confidence,
            snapshot_url=snapshot_url,
            pts_timestamp_ms=pts_timestamp_ms,
            sighted_at=now,
        )
        db.add(encounter)
        await db.commit()
        await db.refresh(encounter)
        return encounter

    async def get_trajectory(self, db: AsyncSession, plate: str) -> Optional[VehicleTrajectory]:
        """Queries complete trajectory timeline with all historical checkpoint encounters."""
        clean_plate = plate.strip().upper().replace(" ", "").replace("-", "")
        stmt = (
            select(VehicleTrajectory)
            .where(VehicleTrajectory.clean_plate == clean_plate)
            .options(selectinload(VehicleTrajectory.encounters))
        )
        res = await db.execute(stmt)
        return res.scalars().first()


tracking_service = TrackingService()
