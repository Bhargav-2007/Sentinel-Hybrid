"""Department-wise Information Requirements & Multi-Department Grouping API Endpoints."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.department import Department
from app.models.camera import Camera
from app.schemas.department import DepartmentResponse, DepartmentCreate
from app.schemas.camera import CameraResponse
from app.api.deps import require_role
from app.models.officer import OfficerRole

router = APIRouter(prefix="/departments", tags=["Department-wise Information & Multi-Tenancy"])

# Default State Departments Seed Data
DEFAULT_DEPARTMENTS = [
    {"code": "POLICE", "name": "Gujarat State Police & CID Crime", "desc": "Law enforcement, crime prevention, and highway patrol", "jurisdiction": "Statewide"},
    {"code": "TRANSPORT_RTO", "name": "Transport Department & RTO Gujarat", "desc": "Commercial transit compliance, speed enforcement, and overload detection", "jurisdiction": "Statewide"},
    {"code": "MUNICIPALITY_AMC", "name": "Ahmedabad Municipal Corporation (AMC)", "desc": "Smart City urban traffic management and civic surveillance", "jurisdiction": "Municipal"},
    {"code": "BORDER_SECURITY", "name": "Coastal & International Border Patrol", "desc": "Coastal security, port perimeters, and border checkposts", "jurisdiction": "Border Corridor"},
    {"code": "FOREST_WILDLIFE", "name": "Forest & Wildlife Department (Gir/Saurashtra)", "desc": "Eco-sensitive corridor monitoring and wildlife transit corridors", "jurisdiction": "Sanctuary Zones"},
]


@router.get("", response_model=List[DepartmentResponse])
async def list_departments(db: AsyncSession = Depends(get_db)):
    """
    Lists all participating state government departments with camera ownership counts.
    Enables department-wise information views and data segregation.
    """
    stmt = select(Department)
    res = await db.execute(stmt)
    departments = list(res.scalars().all())

    # Auto-seed departments if database is empty
    if not departments:
        for d in DEFAULT_DEPARTMENTS:
            dept = Department(
                id=d["code"],
                code=d["code"],
                name=d["name"],
                description=d["desc"],
                jurisdiction_level=d["jurisdiction"]
            )
            db.add(dept)
        await db.commit()
        
        stmt = select(Department)
        res = await db.execute(stmt)
        departments = list(res.scalars().all())

    # Calculate camera counts per department
    result = []
    for d in departments:
        count_stmt = select(func.count(Camera.id)).where(Camera.department_id == d.id)
        count_res = await db.execute(count_stmt)
        cam_count = count_res.scalar() or 0
        
        resp = DepartmentResponse(
            id=d.id,
            code=d.code,
            name=d.name,
            description=d.description,
            nodal_officer=d.nodal_officer,
            contact_email=d.contact_email,
            contact_phone=d.contact_phone,
            jurisdiction_level=d.jurisdiction_level,
            camera_count=cam_count,
            created_at=d.created_at,
        )
        result.append(resp)

    return result


@router.get("/{dept_code}/cameras", response_model=List[CameraResponse])
async def get_cameras_by_department(
    dept_code: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetches all CCTV cameras owned or operated by a specific state department."""
    stmt = select(Camera).where(Camera.department_id == dept_code.upper()).order_by(Camera.stream_id.asc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept_in: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    officer=Depends(require_role([OfficerRole.ADMIN]))
):
    """Registers a new state government department in the platform."""
    dept = Department(
        id=dept_in.code.upper(),
        code=dept_in.code.upper(),
        name=dept_in.name,
        description=dept_in.description,
        nodal_officer=dept_in.nodal_officer,
        contact_email=dept_in.contact_email,
        contact_phone=dept_in.contact_phone,
        jurisdiction_level=dept_in.jurisdiction_level or "Statewide",
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept
