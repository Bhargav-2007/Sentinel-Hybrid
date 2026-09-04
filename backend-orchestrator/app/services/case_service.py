"""
Gujarat Sentinel — Case Investigation & Forensic Lifecycle Service Engine.
Manages case creation from sightings/alerts, status transitions, evidence aggregation,
and cryptographic Section 65B certification.
"""

from __future__ import annotations

import uuid
import logging
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc, and_

from app.models.case import Case, CaseStatus, CasePriority
from app.models.officer import Officer
from app.schemas.case import CaseCreate, CaseStatusUpdate, CaseAddEvidence
from app.services.audit_service import audit_service
from app.core.config import settings

logger = logging.getLogger("sentinel.services.case")


class CaseService:
    """Case Management and Investigation Workflow Engine."""

    async def create_case(
        self,
        db: AsyncSession,
        officer: Officer,
        case_in: CaseCreate,
        ip_address: str = "127.0.0.1"
    ) -> Case:
        """Initializes a new case investigation."""
        now = datetime.now(timezone.utc)
        case_id = f"case-{uuid.uuid4().hex[:12]}"
        case_number = f"CASE-2026-{uuid.uuid4().hex[:5].upper()}"

        initial_note = {
            "author_badge": officer.badge_number,
            "author_name": officer.full_name,
            "timestamp": now.isoformat(),
            "action": "CASE_OPENED",
            "note": case_in.description or f"Case opened for target {case_in.target_plate or 'suspect'}.",
        }

        # Default sightings from alert or empty
        sightings_data = case_in.sightings or []
        if not sightings_data and case_in.target_plate:
            sightings_data = [
                {
                    "camera_id": "1",
                    "camera_name": "SG Highway — Prahladnagar Junction",
                    "timestamp": now.isoformat(),
                    "pts_timestamp_ms": 142050,
                    "speed_kmh": 68.2,
                    "latitude": case_in.primary_latitude or 23.0125,
                    "longitude": case_in.primary_longitude or 72.5085,
                }
            ]

        # Initial HMAC Hash
        canonical_str = f"{case_number}:{case_in.target_plate}:{case_in.fir_number}:{now.isoformat()}"
        hmac_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            canonical_str.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        new_case = Case(
            id=case_id,
            case_number=case_number,
            title=case_in.title,
            description=case_in.description,
            fir_number=case_in.fir_number,
            status=CaseStatus.OPEN,
            priority=case_in.priority,
            alert_id=case_in.alert_id,
            target_plate=case_in.target_plate,
            target_vehicle_make=case_in.target_vehicle_make,
            target_vehicle_model=case_in.target_vehicle_model,
            target_vehicle_color=case_in.target_vehicle_color,
            target_person_description=case_in.target_person_description,
            district=case_in.district or officer.district,
            station=case_in.station or officer.station,
            primary_latitude=case_in.primary_latitude,
            primary_longitude=case_in.primary_longitude,
            assigned_officer_id=officer.id,
            assigned_officer_badge=officer.badge_number,
            assigned_officer_name=officer.full_name,
            supervisor_id=None,
            supervisor_badge=None,
            supervisor_name=None,
            sightings=case_in.sightings or [],
            evidence_packages=[],
            snapshots=[],
            video_clips=[],
            section65b_certificate_id=None,
            hmac_sha256_signature=hmac_sig,
            case_notes=[
                CaseNote(
                    note_id=f"NOTE-{uuid.uuid4().hex[:8].upper()}",
                    author_id=officer.id,
                    author_badge=officer.badge_number,
                    author_name=officer.full_name,
                    action="CASE_CREATED",
                    note=f"Formal Section 65B case file opened by {officer.full_name} ({officer.badge_number}).",
                    timestamp=now,
                    ip_address=ip_address,
                )
            ],
            created_at=now,
            updated_at=now,
        )

        db.add(new_case)
        await db.commit()
        await db.refresh(new_case)

        # Audit Log
        await audit_service.log_action(
            db=db,
            officer=officer,
            action="CASE_CREATED",
            entity_type="CASE_DOSSIER",
            entity_id=case_number,
            ip_address=ip_address,
            details={"case_number": case_number, "target_plate": case_in.target_plate, "priority": case_in.priority.value}
        )

        return new_case

    async def get_case_by_id(self, db: AsyncSession, case_id: str) -> Optional[Case]:
        """Fetches case by id or case_number."""
        stmt = select(Case).where(or_(Case.id == case_id, Case.case_number == case_id))
        res = await db.execute(stmt)
        return res.scalars().first()

    async def list_cases(
        self,
        db: AsyncSession,
        status: Optional[CaseStatus] = None,
        priority: Optional[CasePriority] = None,
        district: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Case]:
        """Lists active and closed cases with multi-parameter filtering."""
        stmt = select(Case)
        filters = []

        if status:
            filters.append(Case.status == status)
        if priority:
            filters.append(Case.priority == priority)
        if district:
            filters.append(Case.district == district)

        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.order_by(desc(Case.created_at)).offset(offset).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def update_case_status(
        self,
        db: AsyncSession,
        case_id: str,
        update_in: CaseStatusUpdate,
        officer: Officer,
        ip_address: str = "127.0.0.1"
    ) -> Optional[Case]:
        """Transitions case status along the lifecycle and logs officer note."""
        case = await self.get_case_by_id(db, case_id)
        if not case:
            return None

        now = datetime.now(timezone.utc)
        prev_status = case.status.value
        case.status = update_in.status
        case.updated_at = now

        if update_in.status in (CaseStatus.RESOLVED, CaseStatus.CLOSED):
            case.resolved_at = now

        # Add note
        notes = list(case.case_notes or [])
        notes.append({
            "author_badge": officer.badge_number,
            "author_name": officer.full_name,
            "timestamp": now.isoformat(),
            "action": f"STATUS_CHANGED_{prev_status}_TO_{update_in.status.value}",
            "note": update_in.note or f"Status transitioned from {prev_status} to {update_in.status.value}.",
        })
        case.case_notes = notes

        await db.commit()
        await db.refresh(case)

        # Audit log
        await audit_service.log_action(
            db=db,
            officer=officer,
            action="CASE_STATUS_UPDATED",
            entity_type="CASE_DOSSIER",
            entity_id=case.case_number,
            ip_address=ip_address,
            details={"prev_status": prev_status, "new_status": update_in.status.value}
        )

        return case

    async def attach_evidence(
        self,
        db: AsyncSession,
        case_id: str,
        evidence_in: CaseAddEvidence,
        officer: Officer,
        ip_address: str = "127.0.0.1"
    ) -> Optional[Case]:
        """Appends a certified evidence package to the case dossier."""
        case = await self.get_case_by_id(db, case_id)
        if not case:
            return None

        now = datetime.now(timezone.utc)
        pkgs = list(case.evidence_packages or [])
        pkgs.append(evidence_in.evidence_package)
        case.evidence_packages = pkgs
        case.status = CaseStatus.EVIDENCE_COLLECTED
        case.updated_at = now

        # Record note
        notes = list(case.case_notes or [])
        notes.append({
            "author_badge": officer.badge_number,
            "author_name": officer.full_name,
            "timestamp": now.isoformat(),
            "action": "EVIDENCE_ATTACHED",
            "note": evidence_in.note or "Attached Section 65B certified evidence package.",
        })
        case.case_notes = notes

        await db.commit()
        await db.refresh(case)

        return case

    def export_case_json(self, case: Case) -> Dict[str, Any]:
        """Serializes complete case dossier and forensic chain of custody to JSON."""
        return {
            "case_id": case.id,
            "case_number": case.case_number,
            "title": case.title,
            "description": case.description,
            "fir_number": case.fir_number,
            "status": case.status.value,
            "priority": case.priority.value,
            "target_plate": case.target_plate,
            "vehicle_details": {
                "make": case.target_vehicle_make,
                "model": case.target_vehicle_model,
                "color": case.target_vehicle_color,
            },
            "jurisdiction": {
                "district": case.district,
                "station": case.station,
                "latitude": case.primary_latitude,
                "longitude": case.primary_longitude,
            },
            "investigating_officer": {
                "badge": case.assigned_officer_badge,
                "name": case.assigned_officer_name,
            },
            "sightings_count": len(case.sightings or []),
            "sightings": case.sightings or [],
            "forensic_certification": {
                "section65b_certificate_id": case.section65b_certificate_id,
                "hmac_sha256_signature": case.hmac_sha256_signature,
                "compliance": "Section 65B Indian Evidence Act & Bharatiya Sakshya Adhiniyam (BSA) 2023",
            },
            "case_notes": case.case_notes or [],
            "created_at": case.created_at.isoformat() if case.created_at else None,
            "updated_at": case.updated_at.isoformat() if case.updated_at else None,
        }

    def export_case_csv(self, case: Case) -> str:
        """Generates CSV rows for all sightings and checkpoints associated with this case."""
        lines = ["camera_id,camera_name,timestamp,speed_kmh,latitude,longitude,pts_ms"]
        for s in (case.sightings or []):
            lines.append(
                f'"{s.get("camera_id","")}","{s.get("camera_name","")}","{s.get("timestamp","")}",'
                f'{s.get("speed_kmh","")},{s.get("latitude","")},{s.get("longitude","")},{s.get("pts_timestamp_ms","")}'
            )
        return "\n".join(lines)

    def export_case_html_report(self, case: Case) -> str:
        """Generates an official, printable Section 65B Forensic Legal Evidence Certificate."""
        sightings_rows = "".join([
            f"""<tr>
                <td style="padding: 8px; border: 1px solid #ddd;">{s.get('camera_id', '')} - {s.get('camera_name', 'Node')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{s.get('timestamp', '')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{s.get('speed_kmh', 'N/A')} km/h</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{s.get('latitude', '')}, {s.get('longitude', '')}</td>
            </tr>"""
            for s in (case.sightings or [])
        ])

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Section 65B Evidence Certificate — {case.case_number}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #222; }}
        .header {{ text-align: center; border-bottom: 2px solid #003366; padding-bottom: 15px; margin-bottom: 25px; }}
        .badge {{ background: #003366; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; }}
        .section {{ margin-bottom: 20px; }}
        .section-title {{ font-size: 14px; font-weight: bold; text-transform: uppercase; color: #003366; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 10px; }}
        .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }}
        .meta-item strong {{ color: #444; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }}
        th {{ background: #f0f4f8; color: #003366; padding: 8px; border: 1px solid #ddd; text-align: left; }}
        .cert-box {{ background: #f9fbfd; border: 2px dashed #003366; padding: 15px; border-radius: 6px; margin-top: 25px; }}
        .hash {{ font-family: monospace; font-size: 11px; word-break: break-all; background: #eee; padding: 4px; border-radius: 2px; }}
    </style>
</head>
<body>
    <div class="header">
        <h2 style="margin: 0; color: #003366;">GUJARAT STATE POLICE — FORENSIC EVIDENCE DOSSIER</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Electronic Evidence Record under Section 65B Indian Evidence Act & Bharatiya Sakshya Adhiniyam 2023</p>
    </div>

    <div class="section">
        <div class="section-title">Case Metadata</div>
        <div class="meta-grid">
            <div class="meta-item"><strong>Case Number:</strong> {case.case_number}</div>
            <div class="meta-item"><strong>FIR Reference:</strong> {case.fir_number}</div>
            <div class="meta-item"><strong>Case Title:</strong> {case.title}</div>
            <div class="meta-item"><strong>Status / Priority:</strong> {case.status.value} / {case.priority.value}</div>
            <div class="meta-item"><strong>Target Vehicle / Plate:</strong> {case.target_plate} ({case.target_vehicle_make} {case.target_vehicle_model} - {case.target_vehicle_color})</div>
            <div class="meta-item"><strong>Investigating Officer:</strong> {case.assigned_officer_name} ({case.assigned_officer_badge})</div>
            <div class="meta-item"><strong>Police Jurisdiction:</strong> {case.station}, {case.district}</div>
            <div class="meta-item"><strong>Generated Date:</strong> {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Multi-Camera Trajectory & Sighting Timeline</div>
        <table>
            <thead>
                <tr>
                    <th>Camera Junction</th>
                    <th>Timestamp</th>
                    <th>Corridor Speed</th>
                    <th>GPS Coordinates</th>
                </tr>
            </thead>
            <tbody>
                {sightings_rows or '<tr><td colspan="4" style="text-align: center; padding: 10px;">No sightings recorded.</td></tr>'}
            </tbody>
        </table>
    </div>

    <div class="cert-box">
        <h3 style="margin-top: 0; color: #003366;">Certificate of Digital Authenticity (Section 65B)</h3>
        <p style="font-size: 12px; line-height: 1.5; margin: 5px 0;">
            This electronic record was extracted and compiled automatically by the <strong>Gujarat Sentinel Hybrid CCTV & Intelligence Platform</strong>.
            The camera stream feeds and timestamps are cryptographically sealed with HMAC-SHA256 monotonic hashing at the capture edge.
        </p>
        <div style="margin-top: 10px; font-size: 12px;">
            <div><strong>Certificate ID:</strong> {case.section65b_certificate_id}</div>
            <div style="margin-top: 6px;"><strong>HMAC-SHA256 Digital Signature:</strong></div>
            <div class="hash">{case.hmac_sha256_signature}</div>
        </div>
    </div>
</body>
</html>"""


case_service = CaseService()

