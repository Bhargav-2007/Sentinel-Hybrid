"""
Gujarat Sentinel — Model 1
Department API Router (v1)
"""

from __future__ import annotations

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_admin, require_operator
from app.db.models import Camera, Department
from app.db.session import get_session
from app.schemas.camera import (
    DepartmentCreateSchema,
    DepartmentListResponseSchema,
    DepartmentSchema,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=DepartmentListResponseSchema)
async def list_departments(
    db: Annotated[AsyncSession, Depends(get_session)],
) -> DepartmentListResponseSchema:
    """List all registered departments with camera counts."""
    result = await db.execute(
        select(
            Department,
            func.count(Camera.id).label("camera_count"),
        )
        .outerjoin(Camera, Camera.department_id == Department.id)
        .where(Camera.deleted_at.is_(None) | Camera.deleted_at.is_(None))
        .group_by(Department.id)
        .order_by(Department.code)
    )
    rows = result.all()

    departments = [
        DepartmentSchema(
            id=row.Department.id,
            code=row.Department.code,
            name=row.Department.name,
            contact_email=row.Department.contact_email,
            contact_phone=row.Department.contact_phone,
            metadata=row.Department.extra_metadata or {},
            camera_count=row.camera_count,
            created_at=row.Department.created_at,
        )
        for row in rows
    ]

    return DepartmentListResponseSchema(departments=departments, total=len(departments))


@router.post(
    "",
    response_model=DepartmentSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_department(
    data: DepartmentCreateSchema,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> DepartmentSchema:
    """Create a new department."""
    dept = Department(
        code=data.code.upper(),
        name=data.name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        extra_metadata=data.metadata,
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)

    return DepartmentSchema(
        id=dept.id,
        code=dept.code,
        name=dept.name,
        contact_email=dept.contact_email,
        contact_phone=dept.contact_phone,
        metadata=dept.extra_metadata or {},
        camera_count=0,
        created_at=dept.created_at,
    )


@router.get("/{dept_id}", response_model=DepartmentSchema)
async def get_department(
    dept_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_session)],
) -> DepartmentSchema:
    """Get department details."""
    from fastapi import HTTPException

    result = await db.execute(
        select(Department, func.count(Camera.id).label("camera_count"))
        .outerjoin(Camera, (Camera.department_id == Department.id) & Camera.deleted_at.is_(None))
        .where(Department.id == dept_id)
        .group_by(Department.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found")

    return DepartmentSchema(
        id=row.Department.id,
        code=row.Department.code,
        name=row.Department.name,
        contact_email=row.Department.contact_email,
        contact_phone=row.Department.contact_phone,
        metadata=row.Department.extra_metadata or {},
        camera_count=row.camera_count,
        created_at=row.Department.created_at,
    )
