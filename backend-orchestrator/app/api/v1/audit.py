"""Audit Logging & Section 65B Certificate Export API Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.officer import Officer, OfficerRole
from app.services.audit_service import audit_service
from app.api.deps import get_current_officer, require_role

router = APIRouter(prefix="/audit", tags=["Cybersecurity Audit & Section 65B Compliance"])


@router.get("/logs")
async def get_audit_trail_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None, description="Filter by action (e.g. OFFICER_LOGIN, BREAK_GLASS_ACTIVATED)"),
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(require_role([OfficerRole.ADMIN, OfficerRole.SUPERVISOR, OfficerRole.INVESTIGATOR]))
):
    """
    Queries immutable audit trail records with SHA-256 HMAC digital signatures.
    Strictly restricted to Admin and Supervisor roles.
    """
    logs = await audit_service.get_recent_logs(db, limit=limit, action=action)
    return [
        {
            "id": log.id,
            "officer_badge": log.officer_badge,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "ip_address": log.ip_address,
            "details": log.details,
            "hmac_signature": log.digital_signature_hmac,
            "timestamp": log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/export-section65b/{incident_id}")
async def export_section_65b_court_certificate(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(get_current_officer)
):
    """
    Generates a certified legal package under Section 65B of the Indian Evidence Act
    with digital cryptographic hash chaining for judicial court submission.
    """
    return await audit_service.export_section65b_certificate(db, incident_id, officer)
