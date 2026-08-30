"""
Gujarat Sentinel — Model 2
ANPR Service — Detection queries and vehicle route reconstruction
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime

import structlog
from fastapi import Depends, HTTPException
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ANPRDetection
from app.db.session import get_session
from app.schemas.schemas import (
    ANPRDetectionSchema,
    BoundingBoxSchema,
    DetectionDetailSchema,
    DetectionListResponseSchema,
    StreamLocationSchema,
    VehicleMovementHistorySchema,
    normalise_plate,
)

logger = structlog.get_logger(__name__)


class ANPRService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_detections(
        self,
        plate_number: str | None = None,
        camera_id: str | None = None,
        from_time: datetime | None = None,
        to_time: datetime | None = None,
        min_confidence: float = 0.75,
        page: int = 1,
        page_size: int = 50,
    ) -> DetectionListResponseSchema:
        """List detections with comprehensive filtering."""
        query = select(ANPRDetection).where(ANPRDetection.confidence >= min_confidence)

        if plate_number:
            normalised = normalise_plate(plate_number)
            if len(normalised) >= 4:
                query = query.where(
                    ANPRDetection.plate_number_normalised.ilike(f"%{normalised}%")
                )
            else:
                query = query.where(
                    ANPRDetection.plate_number.ilike(f"%{plate_number}%")
                )

        if camera_id:
            query = query.where(ANPRDetection.camera_id == camera_id)
        if from_time:
            query = query.where(ANPRDetection.timestamp >= from_time)
        if to_time:
            query = query.where(ANPRDetection.timestamp <= to_time)

        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one()

        # Paginate
        offset = (page - 1) * page_size
        query = query.order_by(ANPRDetection.timestamp.desc()).offset(offset).limit(page_size)
        result = await self.db.execute(query)
        detections = result.scalars().all()

        return DetectionListResponseSchema(
            items=[self._to_schema(d) for d in detections],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def search_vehicle_movement(
        self,
        plate_number: str,
        from_time: datetime | None = None,
        to_time: datetime | None = None,
    ) -> VehicleMovementHistorySchema:
        """
        Reconstruct vehicle movement from ANPR detections.

        This is the primary route reconstruction endpoint.
        Returns all sightings of a plate sorted by timestamp.
        """
        normalised = normalise_plate(plate_number)

        query = select(ANPRDetection).where(
            ANPRDetection.plate_number_normalised == normalised
        )
        if from_time:
            query = query.where(ANPRDetection.timestamp >= from_time)
        if to_time:
            query = query.where(ANPRDetection.timestamp <= to_time)

        query = query.order_by(ANPRDetection.timestamp.asc())
        result = await self.db.execute(query)
        detections = result.scalars().all()

        # Compute summary
        districts = list(set(d.district for d in detections if d.district))
        cameras = list(set(d.camera_id for d in detections))

        first_seen = detections[0].timestamp if detections else None
        last_seen = detections[-1].timestamp if detections else None

        return VehicleMovementHistorySchema(
            plate_number=plate_number.upper(),
            total_detections=len(detections),
            first_seen_at=first_seen,
            last_seen_at=last_seen,
            cameras_seen=len(cameras),
            districts_traversed=sorted(districts),
            detections=[self._to_schema(d) for d in detections],
        )

    async def get_detection(self, detection_id: uuid.UUID) -> DetectionDetailSchema:
        """Get a single detection with full details including VAHAN data."""
        result = await self.db.execute(
            select(ANPRDetection).where(ANPRDetection.id == detection_id)
        )
        detection = result.scalar_one_or_none()
        if not detection:
            raise HTTPException(status_code=404, detail="Detection not found")

        schema = self._to_schema(detection)
        return DetectionDetailSchema(
            **schema.model_dump(),
            vahan_data=detection.vahan_data,
            model_version=detection.model_version,
        )

    async def get_stats(self) -> dict:
        """Get ANPR statistics summary."""
        total = (await self.db.execute(
            select(func.count(ANPRDetection.id))
        )).scalar_one()

        unique_plates = (await self.db.execute(
            select(func.count(distinct(ANPRDetection.plate_number_normalised)))
        )).scalar_one()

        stolen_count = (await self.db.execute(
            select(func.count(ANPRDetection.id)).where(ANPRDetection.is_stolen == True)
        )).scalar_one()

        blacklisted_count = (await self.db.execute(
            select(func.count(ANPRDetection.id)).where(ANPRDetection.is_blacklisted == True)
        )).scalar_one()

        cameras_with_detections = (await self.db.execute(
            select(func.count(distinct(ANPRDetection.camera_id)))
        )).scalar_one()

        return {
            "total_detections": total,
            "unique_plates": unique_plates,
            "stolen_vehicles_detected": stolen_count,
            "blacklisted_vehicles_detected": blacklisted_count,
            "cameras_with_detections": cameras_with_detections,
        }

    def _to_schema(self, d: ANPRDetection) -> ANPRDetectionSchema:
        bbox = None
        if d.bbox_x is not None:
            bbox = BoundingBoxSchema(
                x=d.bbox_x, y=d.bbox_y,
                width=d.bbox_width, height=d.bbox_height,
            )

        location = None
        if d.latitude is not None:
            location = StreamLocationSchema(
                latitude=d.latitude,
                longitude=d.longitude,
                district=d.district,
            )

        return ANPRDetectionSchema(
            id=d.id,
            camera_id=d.camera_id,
            stream_id=d.stream_id,
            plate_number=d.plate_number,
            confidence=d.confidence,
            timestamp=d.timestamp,
            pts_ms=d.pts_ms,
            bounding_box=bbox,
            vehicle_type=d.vehicle_type,
            vehicle_color=d.vehicle_color,
            vehicle_confidence=d.vehicle_confidence,
            location=location,
            snapshot_url=d.snapshot_url,
            plate_crop_url=d.plate_crop_url,
            is_stolen=d.is_stolen,
            is_blacklisted=d.is_blacklisted,
            processing_time_ms=d.processing_time_ms,
        )


async def get_anpr_service(db: AsyncSession = Depends(get_session)) -> ANPRService:
    return ANPRService(db)
