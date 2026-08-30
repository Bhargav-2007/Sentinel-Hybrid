"""AI Orchestrator & Multi-Model Correlation API Endpoints."""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.services.ai_orchestrator import ai_orchestrator
from app.adapters.model2_client import model2_client

router = APIRouter(prefix="/orchestrator", tags=["AI Orchestration & Intelligence"])


class IngestDetectionRequest(BaseModel):
    camera_id: str = Field(..., examples=["1"])
    camera_name: str = Field(..., examples=["SG Highway — Prahladnagar Junction"])
    district: str = Field(..., examples=["Ahmedabad City"])
    latitude: float = Field(..., examples=[23.0125])
    longitude: float = Field(..., examples=[72.5085])
    detected_plate: str = Field(..., examples=["GJ01AB1234"])
    confidence_score: float = Field(0.985, ge=0.0, le=1.0)
    vehicle_type: str = Field("CAR", examples=["CAR"])
    vehicle_make: Optional[str] = "Toyota"
    vehicle_model: Optional[str] = "Fortuner"
    vehicle_color: Optional[str] = "Black"
    pts_timestamp_ms: Optional[int] = None
    snapshot_url: Optional[str] = None


@router.get("/health-matrix")
async def get_system_health_matrix():
    """Queries health status across all 4 external AI model backends and central brain."""
    return await ai_orchestrator.get_system_health_matrix()


@router.post("/ingest-detection")
async def ingest_ai_detection(
    req: IngestDetectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests an ANPR detection event:
    1. Persists detection in database
    2. Forwards encounter to Model 4 trajectory stream
    3. Evaluates against eGujCop / VAHAN watchlists
    4. Auto-creates APB alert if on hotlist
    5. Broadcasts live WebSocket event to SOC command wall
    """
    return await ai_orchestrator.process_incoming_detection(
        db=db,
        camera_id=req.camera_id,
        camera_name=req.camera_name,
        district=req.district,
        latitude=req.latitude,
        longitude=req.longitude,
        detected_plate=req.detected_plate,
        confidence_score=req.confidence_score,
        vehicle_type=req.vehicle_type,
        vehicle_make=req.vehicle_make,
        vehicle_model=req.vehicle_model,
        vehicle_color=req.vehicle_color,
        pts_timestamp_ms=req.pts_timestamp_ms,
        snapshot_url=req.snapshot_url,
    )


@router.get("/vehicle-360/{plate}")
async def get_vehicle_360_profile(
    plate: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Synthesizes a 360-degree vehicle intelligence profile by correlating:
    - Detection history across all Gujarat cameras
    - Model 4 cross-camera spatial route trajectory
    - Watchlist / eGujCop hotlist match status
    - VAHAN 4.0 vehicle ownership & registration details
    """
    return await ai_orchestrator.correlate_vehicle_360(db, plate)


@router.get("/anpr-stats")
async def get_anpr_statistics():
    """Fetches real-time ANPR inference statistics from Model 2."""
    return await model2_client.get_anpr_statistics()
