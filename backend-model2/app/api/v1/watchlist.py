"""
Gujarat Sentinel — Model 2
Watchlist & Alert API Router
"""

from __future__ import annotations

import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.schemas import (
    AlertListResponseSchema,
    WatchlistAlertSchema,
    WatchlistCreateSchema,
    WatchlistEntrySchema,
    WatchlistListResponseSchema,
)
from app.services.watchlist_service import WatchlistService, get_watchlist_service

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/watchlist", tags=["watchlist"])


# ── Watchlist CRUD ────────────────────────────────────────────────────────────

@router.get("", response_model=WatchlistListResponseSchema, summary="List watchlist entries")
async def list_watchlist(
    type: str | None = Query(None, description="Filter by watchlist type"),
    active: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    service: WatchlistService = Depends(get_watchlist_service),
) -> WatchlistListResponseSchema:
    return await service.list_entries(
        entry_type=type, active=active, page=page, page_size=page_size,
    )


@router.post(
    "",
    response_model=WatchlistEntrySchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add entry to watchlist",
)
async def add_to_watchlist(
    data: WatchlistCreateSchema,
    service: WatchlistService = Depends(get_watchlist_service),
) -> WatchlistEntrySchema:
    """Add a vehicle plate or person identifier to the watchlist."""
    return await service.add_entry(data)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove from watchlist")
async def remove_from_watchlist(
    entry_id: uuid.UUID,
    service: WatchlistService = Depends(get_watchlist_service),
) -> None:
    await service.remove_entry(entry_id)


@router.post("/sync-egujcop", summary="Sync watchlist from eGujCop")
async def sync_from_egujcop(
    service: WatchlistService = Depends(get_watchlist_service),
):
    """Fetch the latest watchlist from eGujCop mock API and merge into local DB."""
    result = await service.sync_from_egujcop()
    return result


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=AlertListResponseSchema, summary="List watchlist alerts")
async def list_alerts(
    acknowledged: bool | None = Query(None),
    from_time: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    service: WatchlistService = Depends(get_watchlist_service),
) -> AlertListResponseSchema:
    """List watchlist match alerts, optionally filtered by acknowledgement status."""
    return await service.list_alerts(
        acknowledged=acknowledged, from_time=from_time, page=page, page_size=page_size,
    )


@router.post("/alerts/{alert_id}/acknowledge", summary="Acknowledge an alert")
async def acknowledge_alert(
    alert_id: uuid.UUID,
    service: WatchlistService = Depends(get_watchlist_service),
):
    """Mark an alert as acknowledged by the operator."""
    await service.acknowledge_alert(alert_id, acknowledged_by="operator")
    return {"status": "acknowledged", "alert_id": str(alert_id)}
