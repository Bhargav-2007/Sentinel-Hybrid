"""Watchlist Service — Hotlist matching, fuzzy Levenshtein comparison, and crime database correlation."""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.watchlist import WatchlistEntry, WatchlistCategory
from app.schemas.watchlist import WatchlistCreate, WatchlistResponse, MatchResult

logger = logging.getLogger("sentinel.services.watchlist")


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


class WatchlistService:
    """Manages hotlist entries and real-time ANPR plate matching algorithms."""

    async def get_all_entries(self, db: AsyncSession, category: Optional[WatchlistCategory] = None) -> List[WatchlistEntry]:
        """Queries active watchlist hotlist entries."""
        stmt = select(WatchlistEntry).where(WatchlistEntry.is_active == True)
        if category:
            stmt = stmt.where(WatchlistEntry.category == category)
        stmt = stmt.order_by(WatchlistEntry.created_at.desc())
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def create_entry(self, db: AsyncSession, entry_in: WatchlistCreate) -> WatchlistEntry:
        """Adds a target license plate to the state hotlist."""
        clean_id = entry_in.identifier.strip().upper().replace(" ", "").replace("-", "")
        entry = WatchlistEntry(
            id=f"WCH-{uuid.uuid4().hex[:8].upper()}",
            category=entry_in.category,
            identifier=entry_in.identifier.upper(),
            clean_identifier=clean_id,
            reason=entry_in.reason,
            case_number=entry_in.case_number,
            police_station=entry_in.police_station or "State Crime Branch",
            investigating_officer=entry_in.investigating_officer,
            priority=entry_in.priority,
            source_database=entry_in.source_database,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            expires_at=entry_in.expires_at,
            extra_metadata=entry_in.extra_metadata or {},
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    async def check_plate(self, db: AsyncSession, detected_plate: str) -> MatchResult:
        """
        Evaluates a detected license plate against all active hotlists:
        1. Exact match (100% confidence)
        2. Fuzzy Levenshtein match for OCR substitutions (distance <= 1)
        """
        clean_detected = detected_plate.strip().upper().replace(" ", "").replace("-", "")
        
        # 1. Exact match query
        stmt = select(WatchlistEntry).where(
            and_(
                WatchlistEntry.is_active == True,
                WatchlistEntry.clean_identifier == clean_detected
            )
        )
        res = await db.execute(stmt)
        exact_entry = res.scalars().first()
        
        if exact_entry:
            exact_entry.alert_count += 1
            await db.commit()
            return MatchResult(
                is_match=True,
                match_type="EXACT_MATCH",
                watchlist_entry=WatchlistResponse.model_validate(exact_entry),
                confidence=1.0
            )

        # 2. Fuzzy Levenshtein check across active hotlist entries
        all_entries = await self.get_all_entries(db)
        for entry in all_entries:
            dist = _levenshtein_distance(clean_detected, entry.clean_identifier)
            if dist == 1 and len(clean_detected) >= 8:
                entry.alert_count += 1
                await db.commit()
                return MatchResult(
                    is_match=True,
                    match_type="FUZZY_OCR_SUBSTITUTION",
                    watchlist_entry=WatchlistResponse.model_validate(entry),
                    confidence=0.92
                )

        return MatchResult(is_match=False)

    async def seed_default_watchlist(self, db: AsyncSession) -> int:
        """Seeds default Gujarat Police Hotlist entries if table is empty or missing key targets."""
        default_entries = [
            {
                "identifier": "BR10GE",
                "category": WatchlistCategory.STOLEN_VEHICLE,
                "reason": "Bridge Checkpost Alert — Mahindra Bolero used in Interstate Gold Heist",
                "case_number": "FIR-2026-9011/CID",
                "police_station": "Junagadh B-Division PS",
                "investigating_officer": "PI R. K. Vala",
                "priority": "CRITICAL",
                "source_database": "eGujCop Intercept",
            },
            {
                "identifier": "JANPATH",
                "category": WatchlistCategory.WANTED_SUSPECT,
                "reason": "Junagadh VIP Corridor Surveillance — High Risk Threat Vehicle",
                "case_number": "FIR-2026-4412/STATE",
                "police_station": "State Special Operations Group",
                "investigating_officer": "SP V. M. Jadeja",
                "priority": "HIGH",
                "source_database": "CID Crime Intelligence",
            },
            {
                "identifier": "GJ01AB1234",
                "category": WatchlistCategory.STOLEN_VEHICLE,
                "reason": "Ahmedabad SG Highway Robbery Vehicle — White Fortuner",
                "case_number": "FIR-2026-1029/VAST",
                "police_station": "Vastrapur PS, Ahmedabad",
                "investigating_officer": "PSI P. B. Solanki",
                "priority": "CRITICAL",
                "source_database": "eGujCop State Crime",
            },
            {
                "identifier": "GJ05CD5678",
                "category": WatchlistCategory.HIT_AND_RUN,
                "reason": "Surat Ring Road Fatal Hit & Run — Silver Sedan",
                "case_number": "FIR-2026-7821/SUR",
                "police_station": "Athwa Lines PS, Surat",
                "investigating_officer": "PI M. S. Patel",
                "priority": "CRITICAL",
                "source_database": "Traffic Crime Branch",
            },
            {
                "identifier": "GJ03ER9999",
                "category": WatchlistCategory.WANTED_SUSPECT,
                "reason": "Rajkot State Highway Smuggling Convoy Intercept",
                "case_number": "FIR-2026-3390/RJK",
                "police_station": "Bhaktinagar PS, Rajkot",
                "investigating_officer": "DySP H. N. Joshi",
                "priority": "HIGH",
                "source_database": "Anti-Terrorist Squad (ATS)",
            },
            {
                "identifier": "GJ06AB5555",
                "category": WatchlistCategory.BLACK_LISTED,
                "reason": "Vadodara Express Highway — Blacklisted Commercial Vehicle",
                "case_number": "FIR-2026-5501/VAD",
                "police_station": "Makarpura PS, Vadodara",
                "investigating_officer": "RTO Inspector K. D. Barot",
                "priority": "HIGH",
                "source_database": "VAHAN Central Registry",
            },
        ]
        seeded = 0
        for data in default_entries:
            clean_id = data["identifier"].strip().upper().replace(" ", "").replace("-", "")
            stmt = select(WatchlistEntry).where(WatchlistEntry.clean_identifier == clean_id)
            res = await db.execute(stmt)
            if not res.scalars().first():
                entry = WatchlistEntry(
                    id=f"WCH-{uuid.uuid4().hex[:8].upper()}",
                    category=data["category"],
                    identifier=data["identifier"],
                    clean_identifier=clean_id,
                    reason=data["reason"],
                    case_number=data["case_number"],
                    police_station=data["police_station"],
                    investigating_officer=data["investigating_officer"],
                    priority=data["priority"],
                    source_database=data["source_database"],
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    alert_count=0,
                    extra_metadata={"seeded_by": "Gujarat-Sentinel-Hybrid"},
                )
                db.add(entry)
                seeded += 1
        if seeded > 0:
            await db.commit()
            logger.info(f"Seeded {seeded} official Gujarat Police hotlist entries into watchlist.")
        return seeded


watchlist_service = WatchlistService()
