"""Alert Incident Service — Manages APB triage lifecycle and law enforcement workflows."""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc

from app.models.alert import AlertIncident, AlertSeverity, AlertStatus, AlertType
from app.models.officer import Officer
from app.schemas.alert import AlertCreate, AlertUpdate, AlertFilter
from app.core.security import generate_section65b_hmac
from app.services.websocket_manager import ws_manager
from app.services.audit_service import audit_service

logger = logging.getLogger("sentinel.services.alert")


class AlertService:
    """Manages APB incident triage, legal evidence certification, and lifecycle state transitions."""

    async def get_alerts(self, db: AsyncSession, filters: AlertFilter) -> List[AlertIncident]:
        """Queries alert incidents with multi-field filtering."""
        stmt = select(AlertIncident)
        conditions = []

        if filters.severity:
            conditions.append(AlertIncident.severity == filters.severity)
        if filters.status:
            conditions.append(AlertIncident.status == filters.status)
        if filters.alert_type:
            conditions.append(AlertIncident.alert_type == filters.alert_type)
        if filters.district:
            conditions.append(AlertIncident.district == filters.district)
        if filters.search:
            s = f"%{filters.search}%"
            conditions.append(or_(
                AlertIncident.title.ilike(s),
                AlertIncident.description.ilike(s),
                AlertIncident.detected_plate.ilike(s),
                AlertIncident.incident_number.ilike(s),
                AlertIncident.camera_name.ilike(s)
            ))

        if conditions:
            stmt = stmt.where(and_(*conditions))

        stmt = stmt.order_by(desc(AlertIncident.created_at)).offset(filters.offset).limit(filters.limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_alert_by_id(self, db: AsyncSession, alert_id: str) -> Optional[AlertIncident]:
        """Fetches an alert by ID or incident number."""
        stmt = select(AlertIncident).where(or_(AlertIncident.id == alert_id, AlertIncident.incident_number == alert_id))
        res = await db.execute(stmt)
        return res.scalars().first()

    async def create_alert(self, db: AsyncSession, alert_in: AlertCreate) -> AlertIncident:
        """Creates a new APB alert incident with automatic Section 65B HMAC stamp."""
        now = datetime.now(timezone.utc)
        incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
        inc_number = f"APB-2026-{uuid.uuid4().hex[:6].upper()}"

        # Generate Section 65B HMAC signature
        hmac_sig = generate_section65b_hmac(
            incident_id=inc_number,
            camera_id=alert_in.camera_id,
            timestamp=now.isoformat(),
            detected_plate=alert_in.detected_plate or "N/A",
            officer_id="SYSTEM_AUTO_ORCHESTRATOR",
            metadata={
                "type": alert_in.alert_type.value,
                "severity": alert_in.severity.value,
                "district": alert_in.district,
                "lat": alert_in.latitude,
                "lng": alert_in.longitude
            }
        )

        alert = AlertIncident(
            id=incident_id,
            incident_number=inc_number,
            alert_type=alert_in.alert_type,
            severity=alert_in.severity,
            status=AlertStatus.NEW,
            title=alert_in.title,
            description=alert_in.description,
            camera_id=alert_in.camera_id,
            camera_name=alert_in.camera_name,
            district=alert_in.district,
            station=alert_in.station,
            latitude=alert_in.latitude,
            longitude=alert_in.longitude,
            detected_plate=alert_in.detected_plate,
            vehicle_make=alert_in.vehicle_make,
            vehicle_model=alert_in.vehicle_model,
            vehicle_color=alert_in.vehicle_color,
            confidence_score=alert_in.confidence_score,
            snapshot_url=alert_in.snapshot_url,
            video_clip_url=alert_in.video_clip_url,
            fir_number=alert_in.fir_number,
            watchlist_tag=alert_in.watchlist_tag,
            section65b_hmac_hash=hmac_sig,
            created_at=now,
        )
        db.add(alert)
        await db.commit()
        await db.refresh(alert)

        # Broadcast high-priority alert event via WebSocket
        await ws_manager.broadcast_alert({
            "id": alert.id,
            "incident_number": alert.incident_number,
            "type": alert.alert_type.value,
            "severity": alert.severity.value,
            "status": alert.status.value,
            "title": alert.title,
            "description": alert.description,
            "camera_id": alert.camera_id,
            "camera_name": alert.camera_name,
            "district": alert.district,
            "detected_plate": alert.detected_plate,
            "snapshot_url": alert.snapshot_url,
            "created_at": alert.created_at.isoformat(),
        })

        return alert

    async def update_alert_status(
        self,
        db: AsyncSession,
        alert_id: str,
        officer: Officer,
        new_status: AlertStatus,
        notes: Optional[str] = None
    ) -> Optional[AlertIncident]:
        """Transitions alert incident lifecycle status (ACKNOWLEDGE, INVESTIGATE, ESCALATE, CLOSE)."""
        alert = await self.get_alert_by_id(db, alert_id)
        if not alert:
            return None

        now = datetime.now(timezone.utc)
        prev_status = alert.status.value
        alert.status = new_status

        if new_status == AlertStatus.ACKNOWLEDGED and not alert.acknowledged_by:
            alert.acknowledged_by = f"{officer.officer_id} ({officer.badge_number})"
            alert.acknowledged_at = now
        elif new_status in (AlertStatus.CLOSED, AlertStatus.FALSE_POSITIVE):
            alert.resolved_by = f"{officer.officer_id} ({officer.badge_number})"
            alert.resolved_at = now

        await db.commit()
        await db.refresh(alert)

        # Audit log the status transition
        await audit_service.log_action(
            db=db,
            officer=officer,
            action=f"ALERT_STATUS_{new_status.value}",
            entity_type="ALERT",
            entity_id=alert.id,
            ip_address="127.0.0.1",
            details={
                "incident_number": alert.incident_number,
                "from_status": prev_status,
                "to_status": new_status.value,
                "notes": notes
            }
        )

        # Broadcast update to SOC wall
        await ws_manager.broadcast_alert_update({
            "id": alert.id,
            "status": alert.status.value,
            "updated_by": officer.officer_id,
            "timestamp": now.isoformat(),
        })

        return alert


alert_service = AlertService()
