"""
Gujarat Sentinel — Model 2
Stream API Router — RTSP stream management & catalogue
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.schemas import (
    StreamCatalogueResponseSchema,
    StreamConnectResponseSchema,
    StreamDetailSchema,
    StreamLocationSchema,
)
from app.services.stream_service import StreamService, get_stream_service

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/streams", tags=["streams"])


@router.get("", response_model=StreamCatalogueResponseSchema, summary="List all camera streams")
async def list_streams(
    status_filter: str | None = Query(None, alias="status"),
    department_id: str | None = Query(None),
    service: StreamService = Depends(get_stream_service),
) -> StreamCatalogueResponseSchema:
    """Returns the stream catalogue with connection URLs and analytics status."""
    return await service.list_streams(status_filter=status_filter, department_id=department_id)


@router.get("/ingest", summary="Sentinel-compatible /api/ingest endpoint")
async def get_ingest_catalogue(
    service: StreamService = Depends(get_stream_service),
):
    """Returns the stream catalogue in the same format as the Sentinel live grid."""
    return await service.get_ingest_catalogue()


@router.get("/{stream_id}", response_model=StreamDetailSchema, summary="Get stream details")
async def get_stream(
    stream_id: str,
    service: StreamService = Depends(get_stream_service),
) -> StreamDetailSchema:
    return await service.get_stream(stream_id)


@router.post(
    "/{stream_id}/connect",
    response_model=StreamConnectResponseSchema,
    summary="Start RTSP consumer with analytics",
)
async def connect_stream(
    stream_id: str,
    service: StreamService = Depends(get_stream_service),
) -> StreamConnectResponseSchema:
    """Activate the RTSP TCP consumer and analytics pipeline for a stream."""
    return await service.connect_stream(stream_id)


@router.post("/{stream_id}/disconnect", summary="Stop RTSP consumer")
async def disconnect_stream(
    stream_id: str,
    service: StreamService = Depends(get_stream_service),
):
    """Stop the RTSP consumer and analytics pipeline."""
    await service.disconnect_stream(stream_id)
    return {"status": "disconnected", "stream_id": stream_id}


@router.post("/connect-all", summary="Connect all discovered streams")
async def connect_all_streams(
    max_streams: int = Query(10, ge=1, le=50),
    service: StreamService = Depends(get_stream_service),
):
    """Start RTSP consumers for all discovered streams (up to limit)."""
    count = await service.connect_all(max_streams=max_streams)
    return {"connected": count, "max_streams": max_streams}


@router.post("/sync", summary="Re-sync stream catalogue from simulator")
async def sync_catalogue(
    service: StreamService = Depends(get_stream_service),
):
    """Fetch the latest stream catalogue from the RTSP simulator."""
    count = await service.sync_catalogue()
    return {"synced": count}
