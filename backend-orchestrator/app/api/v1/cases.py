"""
Gujarat Sentinel — Case Investigation & Forensic Lifecycle API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.permissions import Permission
from app.models.officer import Officer
from app.models.case import CaseStatus, CasePriority
from app.schemas.case import CaseCreate, CaseStatusUpdate, CaseAddEvidence, CaseResponse
from app.services.case_service import case_service
from app.api.deps import get_current_officer, get_client_ip, require_permission

router = APIRouter(prefix="/cases", tags=["Case Management & Investigation Lifecycle"])


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_case(
    case_in: CaseCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(require_permission(Permission.CASE_CREATE)),
):
    """
    Creates a new formal police investigation case dossier.
    Requires `case.create` permission.
    """
    client_ip = get_client_ip(request)
    return await case_service.create_case(db, officer, case_in, ip_address=client_ip)


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[CaseStatus] = Query(None, description="Filter by case status"),
    priority: Optional[CasePriority] = Query(None, description="Filter by priority"),
    district: Optional[str] = Query(None, description="Filter by district"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
):
    """
    Lists active and historical cases with filtering.
    """
    return await case_service.list_cases(
        db=db,
        status=status,
        priority=priority,
        district=district,
        limit=limit,
        offset=offset
    )


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case_details(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
):
    """
    Retrieves full case dossier with sighting history, snapshot/video links, and Section 65B signature.
    """
    case = await case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    return case


@router.patch("/{case_id}/status", response_model=CaseResponse)
async def update_case_status(
    case_id: str,
    update_in: CaseStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(require_permission(Permission.CASE_MANAGE)),
):
    """
    Transitions case status along the lifecycle:
    `OPEN -> INVESTIGATING -> EVIDENCE_COLLECTED -> UNDER_REVIEW -> RESOLVED -> CLOSED`.
    Requires `case.manage` permission.
    """
    client_ip = get_client_ip(request)
    case = await case_service.update_case_status(db, case_id, update_in, officer, ip_address=client_ip)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    return case


@router.post("/{case_id}/evidence", response_model=CaseResponse)
async def attach_case_evidence(
    case_id: str,
    evidence_in: CaseAddEvidence,
    request: Request,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(require_permission(Permission.CASE_MANAGE)),
):
    """
    Attaches a certified Section 65B evidence package to the case dossier.
    Requires `case.manage` permission.
    """
    client_ip = get_client_ip(request)
    case = await case_service.attach_evidence(db, case_id, evidence_in, officer, ip_address=client_ip)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")
    return case
