"""APB Alert Incidents & Threat Triage API Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.alert import AlertResponse, AlertCreate, AlertFilter
from app.models.alert import AlertSeverity, AlertStatus, AlertType
from app.models.officer import Officer
from app.services.alert_service import alert_service
from app.api.deps import get_current_officer

router = APIRouter(prefix="/alerts", tags=["APB Threat Triage & Alerts"])


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    severity: Optional[AlertSeverity] = Query(None),
    status: Optional[AlertStatus] = Query(None),
    alert_type: Optional[AlertType] = Query(None),
    district: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Queries APB alerts with multi-parameter filtering."""
    filters = AlertFilter(
        severity=severity,
        status=status,
        alert_type=alert_type,
        district=district,
        search=search,
        limit=limit,
        offset=offset
    )
    return await alert_service.get_alerts(db, filters)


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert_details(
    alert_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetches details, legal FIR reference, and Section 65B HMAC stamp for an alert."""
    alert = await alert_service.get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found.")
    return alert


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_in: AlertCreate,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new APB alert incident with automatic Section 65B HMAC digital signature."""
    return await alert_service.create_alert(db, alert_in)


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    notes: Optional[str] = Query(None),
    officer: Officer = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db)
):
    """Duty officer acknowledges the APB alert and assigns it to current patrol shift."""
    alert = await alert_service.update_alert_status(db, alert_id, officer, AlertStatus.ACKNOWLEDGED, notes)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found.")
    return alert


@router.post("/{alert_id}/investigate", response_model=AlertResponse)
async def investigate_alert(
    alert_id: str,
    notes: Optional[str] = Query(None),
    officer: Officer = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db)
):
    """Marks alert as under active investigation by dispatched PCR patrol unit."""
    alert = await alert_service.update_alert_status(db, alert_id, officer, AlertStatus.INVESTIGATING, notes)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found.")
    return alert


@router.post("/{alert_id}/escalate", response_model=AlertResponse)
async def escalate_alert(
    alert_id: str,
    notes: Optional[str] = Query(None),
    officer: Officer = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db)
):
    """Escalates alert to District Superintendent / State Cyber Command."""
    alert = await alert_service.update_alert_status(db, alert_id, officer, AlertStatus.ESCALATED, notes)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found.")
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    notes: Optional[str] = Query(None),
    officer: Officer = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db)
):
    """Closes the alert incident following suspect intercept or vehicle recovery."""
    alert = await alert_service.update_alert_status(db, alert_id, officer, AlertStatus.CLOSED, notes)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found.")
    return alert


@router.post("/{alert_id}/false-positive", response_model=AlertResponse)
async def mark_false_positive(
    alert_id: str,
    notes: Optional[str] = Query(None),
    officer: Officer = Depends(get_current_officer),
    db: AsyncSession = Depends(get_db)
):
    """Marks alert as a false positive."""
    alert = await alert_service.update_alert_status(db, alert_id, officer, AlertStatus.FALSE_POSITIVE, notes)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert {alert_id} not found.")
    return alert
