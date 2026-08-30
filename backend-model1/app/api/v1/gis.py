"""
Gujarat Sentinel — Model 1
GIS API Router (v1)

Provides PostGIS-backed endpoints for map visualisation, coverage analysis,
gap reports, and heatmap data. All responses are GeoJSON-compatible.
"""

from __future__ import annotations

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.camera import (
    DistrictListResponseSchema,
    GapAnalysisResultSchema,
    GeoJSONFeatureCollectionSchema,
    HeatmapResultSchema,
)
from app.services.gis_service import GISService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/gis", tags=["gis"])


async def get_gis_service(
    db: Annotated[AsyncSession, Depends(get_session)],
) -> GISService:
    return GISService(db=db)


@router.get(
    "/cameras",
    response_model=GeoJSONFeatureCollectionSchema,
    summary="Get cameras as GeoJSON FeatureCollection",
    response_class=__import__("fastapi").responses.JSONResponse,
)
async def get_cameras_geojson(
    department_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    bbox: str | None = Query(
        None, description="min_lon,min_lat,max_lon,max_lat"
    ),
    cluster: int | None = Query(None, ge=1, le=22, description="Zoom level for clustering"),
    service: GISService = Depends(get_gis_service),
) -> GeoJSONFeatureCollectionSchema:
    """
    Returns all active cameras as a GeoJSON FeatureCollection.

    Suitable for rendering directly in Leaflet/OpenLayers/MapboxGL.
    Each feature includes full camera metadata as properties.

    Tip: Use bbox filter when zoomed in to reduce payload size.
    """
    bbox_tuple = None
    if bbox:
        parts = [float(x) for x in bbox.split(",")]
        bbox_tuple = (parts[0], parts[1], parts[2], parts[3])

    return await service.get_cameras_geojson(
        department_id=department_id,
        status=status,
        bbox=bbox_tuple,
        cluster_zoom=cluster,
    )


@router.get(
    "/coverage",
    response_model=GeoJSONFeatureCollectionSchema,
    summary="Get camera coverage radius polygons",
)
async def get_coverage(
    radius_meters: int = Query(50, ge=5, le=500),
    department_id: uuid.UUID | None = Query(None),
    district: str | None = Query(None),
    service: GISService = Depends(get_gis_service),
) -> GeoJSONFeatureCollectionSchema:
    """
    Returns circular buffer polygons around each camera position.

    The radius represents approximate camera viewing coverage.
    Overlapping circles indicate redundant coverage zones.
    Non-covered areas between circles indicate monitoring gaps.
    """
    return await service.get_coverage_polygons(
        radius_meters=radius_meters,
        department_id=department_id,
        district=district,
    )


@router.get(
    "/gaps",
    response_model=GapAnalysisResultSchema,
    summary="Gap analysis — uncovered monitoring zones",
)
async def get_gap_analysis(
    grid_size_meters: int = Query(500, ge=100, le=5000),
    min_camera_density: float = Query(0.5, description="Minimum cameras per km²"),
    district: str | None = Query(None),
    service: GISService = Depends(get_gis_service),
) -> GapAnalysisResultSchema:
    """
    Identify geographic zones with insufficient camera coverage.

    Returns:
    - Summary statistics (total area, covered %, gap area)
    - GeoJSON polygons of gap zones (red on map)
    - Per-district breakdown

    Use this for infrastructure planning and resource allocation decisions.
    """
    return await service.get_gap_analysis(
        grid_size_meters=grid_size_meters,
        min_camera_density=min_camera_density,
        district=district,
    )


@router.get(
    "/heatmap",
    response_model=HeatmapResultSchema,
    summary="Camera density heatmap (H3 hexagonal)",
)
async def get_heatmap(
    resolution: int = Query(
        7, ge=3, le=12, description="H3 resolution (7=~5km², 9=~0.1km²)"
    ),
    service: GISService = Depends(get_gis_service),
) -> HeatmapResultSchema:
    """
    Returns H3 hexagonal binned camera density data.

    Resolution guide:
    - 6: ~36 km² per hexagon (state overview)
    - 7: ~5 km² per hexagon (city overview) ← recommended
    - 8: ~0.7 km² per hexagon (neighbourhood detail)
    - 9: ~0.1 km² per hexagon (street level)
    """
    return await service.get_heatmap(resolution=resolution)


@router.get(
    "/districts",
    response_model=DistrictListResponseSchema,
    summary="District-level camera statistics",
)
async def get_districts(
    service: GISService = Depends(get_gis_service),
) -> DistrictListResponseSchema:
    """
    Returns camera count statistics per Gujarat district.
    Useful for the district breakdown panel in the GIS dashboard.
    """
    return await service.get_district_stats()
