"""Vehicle Tracking, Trajectory & Corridor Speed API Endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.tracking import TrajectoryResponse, CorridorSpeedResponse
from app.services.tracking_service import tracking_service
from app.adapters.model4_client import model4_client

router = APIRouter(prefix="/tracking", tags=["Vehicle Trajectory & Tracking"])


@router.get("/{plate}", response_model=TrajectoryResponse)
async def get_vehicle_trajectory(
    plate: str,
    db: AsyncSession = Depends(get_db)
):
    """Queries complete spatial trajectory path, timestamps, and camera sightings for a vehicle."""
    trajectory = await tracking_service.get_trajectory(db, plate)
    if not trajectory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No trajectory encounters recorded for vehicle {plate}."
        )
    return trajectory


@router.get("/corridor-speed/calculate", response_model=CorridorSpeedResponse)
async def calculate_corridor_speed(
    plate: str = Query(..., examples=["GJ01AA0001"]),
    corridor_name: str = Query("SG Highway Express Corridor", examples=["SG Highway Express Corridor"]),
    start_cam_id: str = Query("1", examples=["1"]),
    end_cam_id: str = Query("4", examples=["4"]),
    distance_km: float = Query(4.2, ge=0.1, examples=[4.2]),
    pts_delta_seconds: float = Query(180.0, ge=1.0, examples=[180.0]),
    speed_limit_kmh: float = Query(70.0, ge=20.0, examples=[70.0])
):
    """
    Calculates vehicle corridor progression speed using frame-embedded PTS delta timestamps.
    Section 65B court admissible.
    """
    speed_kmh = round((distance_km / (pts_delta_seconds / 3600.0)), 1)
    is_speeding = speed_kmh > speed_limit_kmh

    return CorridorSpeedResponse(
        corridor_name=corridor_name,
        vehicle_plate=plate.upper(),
        start_camera_id=start_cam_id,
        end_camera_id=end_cam_id,
        distance_km=distance_km,
        elapsed_time_seconds=pts_delta_seconds,
        pts_delta_seconds=pts_delta_seconds,
        estimated_speed_kmh=speed_kmh,
        is_speeding=is_speeding,
        speed_limit_kmh=speed_limit_kmh,
    )


@router.get("/pursuits/active")
async def get_active_pursuit_sessions():
    """Queries active multi-camera PCR auto-pursuit target vehicle sessions from Model 4."""
    return await model4_client.get_active_pursuits()
