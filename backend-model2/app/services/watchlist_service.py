"""
Gujarat Sentinel — Model 2
Watchlist Service — Watchlist management, eGujCop sync, and alert handling
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog
from fastapi import Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import (
    AlertPriorityEnum,
    WatchlistAlert,
    WatchlistEntry,
    WatchlistTypeEnum,
)
from app.db.session import get_session
from app.schemas.schemas import (
    AlertListResponseSchema,
    WatchlistAlertSchema,
    WatchlistCreateSchema,
    WatchlistEntrySchema,
    WatchlistListResponseSchema,
    StreamLocationSchema,
    normalise_plate,
)

logger = structlog.get_logger(__name__)


class WatchlistService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    # ── Watchlist CRUD ────────────────────────────────────────────────────

    async def list_entries(
        self,
        entry_type: str | None = None,
        active: bool = True,
        page: int = 1,
        page_size: int = 50,
    ) -> WatchlistListResponseSchema:
        query = select(WatchlistEntry)
        if active is not None:
            query = query.where(WatchlistEntry.is_active == active)
        if entry_type:
            query = query.where(WatchlistEntry.type == entry_type)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(WatchlistEntry.created_at.desc()).offset(offset).limit(page_size)
        result = await self.db.execute(query)
        entries = result.scalars().all()

        items = []
        for e in entries:
            # Count alerts for this entry
            alert_count = (await self.db.execute(
                select(func.count(WatchlistAlert.id))
                .where(WatchlistAlert.watchlist_entry_id == e.id)
            )).scalar_one()

            items.append(WatchlistEntrySchema(
                id=e.id,
                type=e.type,
                identifier=e.identifier,
                description=e.description,
                case_number=e.case_number,
                priority=e.priority,
                source=e.source,
                source_id=e.source_id,
                is_active=e.is_active,
                metadata=e.extra_metadata,
                created_at=e.created_at,
                expires_at=e.expires_at,
                alert_count=alert_count,
            ))

        return WatchlistListResponseSchema(
            items=items, total=total, page=page, page_size=page_size,
        )

    async def add_entry(self, data: WatchlistCreateSchema) -> WatchlistEntrySchema:
        """Add an entry to the watchlist."""
        normalised = normalise_plate(data.identifier)

        # Check for duplicate
        existing = await self.db.execute(
            select(WatchlistEntry).where(
                WatchlistEntry.type == data.type,
                WatchlistEntry.identifier_normalised == normalised,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail=f"Watchlist entry already exists for {data.identifier}",
            )

        entry = WatchlistEntry(
            type=data.type,
            identifier=data.identifier.strip().upper(),
            identifier_normalised=normalised,
            description=data.description,
            case_number=data.case_number,
            priority=data.priority,
            source=data.source,
            source_id=data.source_id,
            is_active=True,
            extra_metadata=data.metadata,
            expires_at=data.expires_at,
        )
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)

        logger.info(
            "watchlist_entry_added",
            type=data.type,
            identifier=data.identifier[:15],
            priority=data.priority,
        )

        return WatchlistEntrySchema(
            id=entry.id,
            type=entry.type,
            identifier=entry.identifier,
            description=entry.description,
            case_number=entry.case_number,
            priority=entry.priority,
            source=entry.source,
            source_id=entry.source_id,
            is_active=entry.is_active,
            metadata=entry.extra_metadata,
            created_at=entry.created_at,
            expires_at=entry.expires_at,
            alert_count=0,
        )

    async def remove_entry(self, entry_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(WatchlistEntry).where(WatchlistEntry.id == entry_id)
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=404, detail="Watchlist entry not found")

        entry.is_active = False
        await self.db.flush()
        logger.info("watchlist_entry_removed", id=str(entry_id))

    async def sync_from_egujcop(self) -> dict[str, Any]:
        """
        Fetch watchlist from the eGujCop mock API and merge into local DB.
        Returns sync statistics.
        """
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.settings.egujcop_api_url.rstrip('/egujcop')}/egujcop/watchlist")
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error("egujcop_sync_failed", error=str(e))
            raise HTTPException(status_code=502, detail=f"eGujCop API unreachable: {e}")

        watchlist_items = data.get("watchlist", [])
        added = 0
        skipped = 0
        errors = 0

        for item in watchlist_items:
            try:
                identifier = item.get("identifier", "").strip().upper()
                normalised = normalise_plate(identifier)
                entry_type = item.get("type", "stolen_vehicle")

                # Check if already exists
                existing = await self.db.execute(
                    select(WatchlistEntry).where(
                        WatchlistEntry.type == entry_type,
                        WatchlistEntry.identifier_normalised == normalised,
                    )
                )
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue

                # Map priority
                priority_map = {
                    "critical": AlertPriorityEnum.critical,
                    "high": AlertPriorityEnum.high,
                    "medium": AlertPriorityEnum.medium,
                    "low": AlertPriorityEnum.low,
                }
                priority = priority_map.get(item.get("priority", "medium"), AlertPriorityEnum.medium)

                entry = WatchlistEntry(
                    type=entry_type,
                    identifier=identifier,
                    identifier_normalised=normalised,
                    description=item.get("description"),
                    case_number=item.get("case_number"),
                    priority=priority,
                    source="egujcop",
                    source_id=item.get("source_id"),
                    is_active=True,
                    extra_metadata=item,
                )
                self.db.add(entry)
                added += 1
            except Exception as e:
                errors += 1
                logger.warning("egujcop_item_failed", error=str(e)[:100])

        await self.db.flush()

        logger.info("egujcop_sync_complete", added=added, skipped=skipped, errors=errors)
        return {
            "total_received": len(watchlist_items),
            "added": added,
            "skipped": skipped,
            "errors": errors,
        }

    # ── Alerts ────────────────────────────────────────────────────────────

    async def list_alerts(
        self,
        acknowledged: bool | None = None,
        from_time: datetime | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> AlertListResponseSchema:
        query = select(WatchlistAlert)

        if acknowledged is not None:
            query = query.where(WatchlistAlert.is_acknowledged == acknowledged)
        if from_time:
            query = query.where(WatchlistAlert.triggered_at >= from_time)

        total = (await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )).scalar_one()

        unack_count = (await self.db.execute(
            select(func.count(WatchlistAlert.id))
            .where(WatchlistAlert.is_acknowledged == False)
        )).scalar_one()

        offset = (page - 1) * page_size
        query = query.order_by(WatchlistAlert.triggered_at.desc()).offset(offset).limit(page_size)
        result = await self.db.execute(query)
        alerts = result.scalars().all()

        return AlertListResponseSchema(
            items=[self._alert_to_schema(a) for a in alerts],
            total=total,
            unacknowledged_count=unack_count,
            page=page,
            page_size=page_size,
        )

    async def acknowledge_alert(self, alert_id: uuid.UUID, acknowledged_by: str) -> None:
        result = await self.db.execute(
            select(WatchlistAlert).where(WatchlistAlert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        alert.is_acknowledged = True
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.now(tz=timezone.utc)
        await self.db.flush()

    def _alert_to_schema(self, a: WatchlistAlert) -> WatchlistAlertSchema:
        location = None
        if a.latitude is not None:
            location = StreamLocationSchema(
                latitude=a.latitude, longitude=a.longitude, district=a.district,
            )

        return WatchlistAlertSchema(
            id=a.id,
            watchlist_entry_id=a.watchlist_entry_id,
            detection_id=a.detection_id,
            alert_type=a.alert_type,
            plate_number=a.plate_number,
            camera_id=a.camera_id,
            priority=a.priority,
            location=location,
            snapshot_url=a.snapshot_url,
            is_acknowledged=a.is_acknowledged,
            acknowledged_by=a.acknowledged_by,
            acknowledged_at=a.acknowledged_at,
            triggered_at=a.triggered_at,
            metadata=a.extra_metadata,
        )


async def get_watchlist_service(db: AsyncSession = Depends(get_session)) -> WatchlistService:
    return WatchlistService(db)
