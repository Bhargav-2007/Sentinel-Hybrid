"""
Gujarat Sentinel — Model 1
Camera API Router (v1)

Implements all camera CRUD and bulk import endpoints.
Handles authentication, validation, and delegates to CameraService.
"""

from __future__ import annotations

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import EventPublisher, get_producer
from app.core.security import CurrentUser, get_current_user, require_admin, require_operator
from app.db.session import get_session
from app.schemas.camera import (
    BulkImportResultSchema,
    CameraBulkImportSchema,
    CameraCreateSchema,
    CameraListParams,
    CameraListResponseSchema,
    CameraResponseSchema,
    CameraUpdateSchema,
)
from app.services.camera_service import CameraService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/cameras", tags=["cameras"])


def get_client_ip(request: Request) -> str | None:
    """Extract client IP from request headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


async def get_camera_service(
    db: Annotated[AsyncSession, Depends(get_session)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    request: Request,
) -> CameraService:
    """FastAPI dependency: construct CameraService with request context."""
    producer = await get_producer()
    publisher = EventPublisher(producer=producer)
    return CameraService(
        db=db,
        publisher=publisher,
        actor_id=current_user.user_id,
        actor_ip=get_client_ip(request),
    )


# ── Camera CRUD endpoints ─────────────────────────────────────────────────────

@router.get(
    "",
    response_model=CameraListResponseSchema,
    summary="List cameras with filtering and pagination",
)
async def list_cameras(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=1000, description="Items per page"),
    department_id: uuid.UUID | None = Query(None),
    status: str | None = Query(None, description="Filter by status"),
    camera_type: str | None = Query(None, description="Filter by camera type"),
    district: str | None = Query(None, description="Filter by district name"),
    search: str | None = Query(None, description="Full-text search"),
    bbox: str | None = Query(None, description="Bounding box: min_lon,min_lat,max_lon,max_lat"),
    service: CameraService = Depends(get_camera_service),
) -> CameraListResponseSchema:
    """
    List cameras with comprehensive filtering.

    Supports:
    - Pagination (page/page_size)
    - Department and status filtering
    - Geographic bounding box filter
    - Full-text search on camera_id, name, address
    """
    from app.db.models import CameraStatusEnum, CameraTypeEnum

    params = CameraListParams(
        page=page,
        page_size=page_size,
        department_id=department_id,
        status=CameraStatusEnum(status) if status else None,
        camera_type=CameraTypeEnum(camera_type) if camera_type else None,
        district=district,
        search=search,
        bbox=bbox,
    )
    return await service.list_cameras(params)


@router.post(
    "",
    response_model=CameraResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Register a single camera",
    dependencies=[Depends(require_operator)],
)
async def register_camera(
    data: CameraCreateSchema,
    service: CameraService = Depends(get_camera_service),
) -> CameraResponseSchema:
    """
    Register a new camera in the registry.

    Publishes a `camera.registered` CloudEvent to Kafka.
    Requires: operator or admin role.
    """
    try:
        return await service.create_camera(data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post(
    "/bulk",
    response_model=BulkImportResultSchema,
    status_code=status.HTTP_207_MULTI_STATUS,
    summary="Bulk import cameras (JSON)",
    dependencies=[Depends(require_operator)],
)
async def bulk_import_cameras(
    data: CameraBulkImportSchema,
    service: CameraService = Depends(get_camera_service),
) -> BulkImportResultSchema:
    """Import multiple cameras from JSON payload (up to 10,000)."""
    return await service.bulk_import_cameras(data)


@router.post(
    "/bulk/csv",
    response_model=BulkImportResultSchema,
    status_code=status.HTTP_207_MULTI_STATUS,
    summary="Bulk import cameras from CSV",
    dependencies=[Depends(require_operator)],
)
async def bulk_import_cameras_csv(
    file: UploadFile = File(...),
    service: CameraService = Depends(get_camera_service),
) -> BulkImportResultSchema:
    """Import multiple cameras from CSV file upload."""
    content = await file.read()
    return await service.bulk_import_from_csv(content.decode("utf-8"))


@router.get(
    "/{camera_id}",
    response_model=CameraResponseSchema,
    summary="Get camera by internal UUID",
)
async def get_camera(
    camera_id: uuid.UUID,
    service: CameraService = Depends(get_camera_service),
) -> CameraResponseSchema:
    """Get detailed camera metadata including latest health status."""
    return await service.get_camera(camera_id)


@router.put(
    "/{camera_id}",
    response_model=CameraResponseSchema,
    summary="Update camera metadata",
    dependencies=[Depends(require_operator)],
)
async def update_camera(
    camera_id: uuid.UUID,
    data: CameraUpdateSchema,
    service: CameraService = Depends(get_camera_service),
) -> CameraResponseSchema:
    """
    Partial update of camera metadata.

    Only provided fields are updated (PATCH semantics in PUT).
    All changes are recorded in the audit trail.
    """
    return await service.update_camera(camera_id, data)


@router.delete(
    "/{camera_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Decommission a camera (soft delete)",
    dependencies=[Depends(require_admin)],
)
async def delete_camera(
    camera_id: uuid.UUID,
    service: CameraService = Depends(get_camera_service),
) -> Response:
    """
    Soft-delete a camera — marks it as decommissioned.

    The camera record and audit trail are preserved.
    Requires: admin role.
    """
    await service.delete_camera(camera_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
