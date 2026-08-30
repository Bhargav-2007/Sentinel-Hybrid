"""
Gujarat Sentinel — Model 2
ANPR API Router — Detection queries and vehicle movement search
"""

from __future__ import annotations

import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, Query

from app.schemas.schemas import (
    ANPRDetectionSchema,
    DetectionDetailSchema,
    DetectionListResponseSchema,
    VehicleMovementHistorySchema,
)
from app.services.anpr_service import ANPRService, get_anpr_service

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/anpr", tags=["anpr"])


@router.get(
    "/detections",
    response_model=DetectionListResponseSchema,
    summary="List ANPR detections with filtering",
)
async def list_detections(
    plate_number: str | None = Query(None, description="Partial plate search"),
    camera_id: str | None = Query(None),
    from_time: datetime | None = Query(None),
    to_time: datetime | None = Query(None),
    min_confidence: float = Query(0.75, ge=0.0, le=1.0),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    service: ANPRService = Depends(get_anpr_service),
) -> DetectionListResponseSchema:
    """
    List ANPR detections with comprehensive filtering.
    Results are ordered by timestamp descending.
    """
    return await service.list_detections(
        plate_number=plate_number,
        camera_id=camera_id,
        from_time=from_time,
        to_time=to_time,
        min_confidence=min_confidence,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/search",
    response_model=VehicleMovementHistorySchema,
    summary="Search vehicle movement history by plate",
)
async def search_by_plate(
    plate_number: str = Query(..., description="Full or partial plate number"),
    from_time: datetime | None = Query(None),
    to_time: datetime | None = Query(None),
    service: ANPRService = Depends(get_anpr_service),
) -> VehicleMovementHistorySchema:
    """
    Returns all detections for a plate sorted by timestamp.
    This is the vehicle route reconstruction endpoint used by the hackathon scenario.
    """
    return await service.search_vehicle_movement(
        plate_number=plate_number,
        from_time=from_time,
        to_time=to_time,
    )


@router.get(
    "/detections/{detection_id}",
    response_model=DetectionDetailSchema,
    summary="Get single detection with snapshot",
)
async def get_detection(
    detection_id: uuid.UUID,
    service: ANPRService = Depends(get_anpr_service),
) -> DetectionDetailSchema:
    """Get detailed detection including VAHAN data and snapshot URLs."""
    return await service.get_detection(detection_id)


@router.get("/stats", summary="ANPR statistics summary")
async def get_anpr_stats(
    service: ANPRService = Depends(get_anpr_service),
):
    """Get summary statistics for ANPR detections."""
    return await service.get_stats()
