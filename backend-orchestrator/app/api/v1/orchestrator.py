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
    detected_plate: str = Field(..., examples=["GJ01AA0001"])
    confidence_score: float = Field(0.985, ge=0.0, le=1.0)
    vehicle_type: str = Field("CAR", examples=["CAR"])
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    pts_timestamp_ms: Optional[int] = None
    snapshot_url: Optional[str] = None


@router.get("/health-matrix")
@router.get("/system-health")
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
@router.get("/vehicle/{plate}")
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
async def get_anpr_statistics(db: AsyncSession = Depends(get_db)):
    """Fetches real-time ANPR inference statistics and database totals."""
    m2_stats = await model2_client.get_anpr_statistics()
    from sqlalchemy import func, select
    from app.models.detection import Detection
    from app.models.camera import Camera

    try:
        total_detections_db = (await db.execute(select(func.count(Detection.id)))).scalar() or 0
        total_cameras_db = (await db.execute(select(func.count(Camera.id)))).scalar() or 0
        active_cameras_db = (await db.execute(select(func.count(Camera.id)).where(Camera.is_active == True))).scalar() or 0
    except Exception:
        total_detections_db = 0
        total_cameras_db = 0
        active_cameras_db = 0

    return {
        **m2_stats,
        "database_records": {
            "total_detections": total_detections_db,
            "total_cameras": total_cameras_db,
            "active_cameras": active_cameras_db,
        },
    }


class CorrelateRequest(BaseModel):
    sighting_a: Dict[str, Any]
    sighting_b: Dict[str, Any]


@router.post("/correlate")
async def correlate_sightings(req: CorrelateRequest):
    """Computes multi-signal Bayesian cross-camera correlation score between two sightings."""
    from datetime import datetime
    from app.services.cross_camera_correlator import cross_camera_correlator, VehicleSighting

    def parse_sighting(d: Dict[str, Any]) -> VehicleSighting:
        ts = d.get("timestamp")
        if isinstance(ts, str):
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                dt = datetime.utcnow()
        elif isinstance(ts, datetime):
            dt = ts
        else:
            dt = datetime.utcnow()

        return VehicleSighting(
            camera_id=str(d.get("camera_id", "1")),
            camera_name=str(d.get("camera_name", "Checkpoint")),
            district=str(d.get("district", "Ahmedabad City")),
            latitude=float(d.get("latitude", 23.0)),
            longitude=float(d.get("longitude", 72.5)),
            plate=str(d.get("plate", "")),
            plate_confidence=float(d.get("plate_confidence", 0.95)),
            vehicle_type=str(d.get("vehicle_type", "CAR")),
            vehicle_color=d.get("vehicle_color"),
            timestamp=dt,
            pts_ms=d.get("pts_ms")
        )

    s_a = parse_sighting(req.sighting_a)
    s_b = parse_sighting(req.sighting_b)
    res = cross_camera_correlator.correlate_vehicle_sightings(s_a, s_b)
    return {
        "is_correlated": res.is_correlated,
        "association_confidence": res.association_confidence,
        "plate_similarity": res.plate_similarity,
        "color_match": res.color_match,
        "vehicle_type_match": res.vehicle_type_match,
        "spatial_temporal_plausibility": res.spatial_temporal_plausibility,
        "implied_speed_kmh": res.implied_speed_kmh,
        "distance_km": res.distance_km,
        "time_delta_seconds": res.time_delta_seconds,
        "cloned_plate_risk": res.cloned_plate_risk,
        "explanation": res.explanation,
    }


class RouteReconstructionRequest(BaseModel):
    plate: str = Field(..., examples=["GJ01AA0001"])
    origin_camera_id: str = Field(..., examples=["1"])
    destination_camera_id: str = Field(..., examples=["5"])


@router.post("/route-reconstruction")
async def reconstruct_vehicle_route(req: RouteReconstructionRequest):
    """Computes Dijkstra shortest-path route reconstruction across Gujarat camera network graph."""
    from app.services.camera_graph import camera_graph_route_engine
    res = camera_graph_route_engine.find_shortest_path(req.origin_camera_id, req.destination_camera_id)
    if not res:
        raise HTTPException(status_code=404, detail="No viable camera corridor found between specified nodes.")

    path_ids, dist_km = res
    return {
        "plate": req.plate,
        "origin_camera_id": req.origin_camera_id,
        "destination_camera_id": req.destination_camera_id,
        "path_camera_ids": path_ids,
        "total_distance_km": dist_km,
        "estimated_travel_time_seconds": round((dist_km / 50.0) * 3600.0, 1),
    }
