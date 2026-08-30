"""Watchlists & Hotlist Database API Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.schemas.watchlist import WatchlistResponse, WatchlistCreate, MatchResult
from app.models.watchlist import WatchlistEntry, WatchlistCategory
from app.models.officer import Officer, OfficerRole
from app.services.watchlist_service import watchlist_service
from app.api.deps import get_current_officer, require_role

router = APIRouter(prefix="/watchlists", tags=["Watchlists & Hotlist Integration"])


@router.get("", response_model=List[WatchlistResponse])
async def list_watchlist_entries(
    category: Optional[WatchlistCategory] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Lists all active hotlist entries from eGujCop / VAHAN crime databases."""
    return await watchlist_service.get_all_entries(db, category)


@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist_entry(
    entry_in: WatchlistCreate,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(require_role([OfficerRole.ADMIN, OfficerRole.SUPERVISOR, OfficerRole.INVESTIGATOR]))
):
    """Adds a target license plate or suspect vehicle to the active state hotlist."""
    return await watchlist_service.create_entry(db, entry_in)


@router.get("/check/{plate}", response_model=MatchResult)
async def check_plate_against_hotlists(
    plate: str,
    db: AsyncSession = Depends(get_db)
):
    """Executes exact & fuzzy Levenshtein matching on a license plate."""
    return await watchlist_service.check_plate(db, plate)


@router.delete("/{entry_id}", status_code=status.HTTP_200_OK)
async def deactivate_watchlist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    officer: Officer = Depends(require_role([OfficerRole.ADMIN, OfficerRole.SUPERVISOR]))
):
    """Deactivates a watchlist entry upon case closure or vehicle recovery."""
    stmt = select(WatchlistEntry).where(WatchlistEntry.id == entry_id)
    res = await db.execute(stmt)
    entry = res.scalars().first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Entry {entry_id} not found.")
        
    entry.is_active = False
    await db.commit()
    return {"message": f"Watchlist entry {entry_id} deactivated successfully."}
