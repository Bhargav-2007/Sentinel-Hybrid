"""Watchlist and Hotlist schemas."""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.watchlist import WatchlistCategory


class WatchlistCreate(BaseModel):
    category: WatchlistCategory = Field(..., examples=[WatchlistCategory.STOLEN_VEHICLE])
    identifier: str = Field(..., description="Target License Plate or Suspect ID", examples=["GJ01AA0001"])
    reason: str = Field(..., description="Case justification", examples=["Vehicle reported stolen"])
    case_number: str = Field(..., examples=["FIR-2026-CR-00100"])
    police_station: Optional[str] = None
    investigating_officer: Optional[str] = None
    priority: str = Field(default="HIGH", examples=["CRITICAL"])
    source_database: str = Field(default="eGujCop", examples=["eGujCop"])
    expires_at: Optional[datetime] = None
    extra_metadata: Optional[Dict[str, Any]] = None


class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: WatchlistCategory
    identifier: str
    clean_identifier: str
    reason: str
    case_number: str
    police_station: str
    investigating_officer: Optional[str]
    priority: str
    source_database: str
    is_active: bool
    alert_count: int
    created_at: datetime
    expires_at: Optional[datetime]


class MatchResult(BaseModel):
    is_match: bool
    match_type: Optional[str] = None  # EXACT, FUZZY, LEVENSHTEIN
    watchlist_entry: Optional[WatchlistResponse] = None
    confidence: float = 1.0
