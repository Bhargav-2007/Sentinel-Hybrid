"""
Gujarat Sentinel — Evidence Management & Section 65B Chain of Custody API Endpoints
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.officer import Officer, OfficerRole
from app.services.evidence_service import evidence_service
from app.services.audit_service import audit_service
from app.api.deps import get_current_officer, get_client_ip, require_role

router = APIRouter(prefix="/evidence", tags=["Evidence Management & Section 65B Chain of Custody"])


class EvidenceVerifyRequest(BaseModel):
    evidence_metadata: Dict[str, Any] = Field(..., description="Canonical metadata dictionary of the evidence package")
    claimed_hmac_hash: str = Field(..., description="The cryptographic SHA-256 HMAC hash to verify")


@router.post("/generate/{incident_id}")
async def generate_evidence_package(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
    client_ip: str = Depends(get_client_ip),
):
    """
    Generates a certified digital evidence package for an APB incident under Section 65B
    with SHA-256 HMAC digital signatures and snapshot/video clip bindings.
    """
    try:
        return await evidence_service.generate_evidence_package(
            db=db,
            alert_id=incident_id,
            officer=officer,
            ip_address=client_ip
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/verify")
async def verify_evidence_integrity(
    req: EvidenceVerifyRequest,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
    client_ip: str = Depends(get_client_ip),
):
    """
    Cryptographically verifies whether an evidence dossier is authentic or has been tampered with.
    Logs the verification attempt into the judicial audit ledger.
    """
    result = evidence_service.verify_evidence_integrity(
        evidence_metadata=req.evidence_metadata,
        claimed_hmac_hash=req.claimed_hmac_hash
    )

    # Record access/verification in audit ledger
    await audit_service.log_action(
        db=db,
        officer=officer,
        action="VERIFY_EVIDENCE_INTEGRITY",
        entity_type="EVIDENCE_VERIFICATION",
        entity_id=req.evidence_metadata.get("incident_number", "UNKNOWN"),
        ip_address=client_ip,
        details={"verification_status": result["status"], "is_valid": result["is_valid"]}
    )

    return result


@router.get("/chain-of-custody/{incident_id}")
async def get_incident_chain_of_custody(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
    client_ip: str = Depends(get_client_ip),
):
    """
    Retrieves the complete immutable Chain of Custody ledger for an incident:
    Who created evidence, who accessed/viewed it, when it was exported, and all modifications.
    """
    # Log access to chain of custody
    await audit_service.log_action(
        db=db,
        officer=officer,
        action="VIEW_CHAIN_OF_CUSTODY",
        entity_type="LEGAL_EVIDENCE",
        entity_id=incident_id,
        ip_address=client_ip,
    )

    return await evidence_service.get_chain_of_custody(db, incident_id)


@router.get("/export/{incident_id}")
async def export_certified_evidence(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
    client_ip: str = Depends(get_client_ip),
):
    """
    Exports a certified forensic package including Section 65B legal certificate,
    evidence metadata, video clip links, and complete chain-of-custody ledger.
    """
    # 1. Generate package
    try:
        package = await evidence_service.generate_evidence_package(
            db=db, alert_id=incident_id, officer=officer, ip_address=client_ip
        )
    except ValueError:
        # Fallback to general export
        package = await audit_service.export_section65b_certificate(db, incident_id, officer)

    # 2. Attach chain of custody
    custody = await evidence_service.get_chain_of_custody(db, incident_id)

    # 3. Log export action
    await audit_service.log_action(
        db=db,
        officer=officer,
        action="EXPORT_FULL_EVIDENCE_DOSSIER",
        entity_type="LEGAL_EVIDENCE",
        entity_id=incident_id,
        ip_address=client_ip,
    )

    return {
        "evidence_package": package,
        "chain_of_custody": custody,
        "export_format": "CERTIFIED_JUDICIAL_JSON_V2",
    }
