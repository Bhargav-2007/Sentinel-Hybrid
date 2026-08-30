"""
Gujarat Sentinel — Mock External APIs
Realistic mock server for VAHAN, SARTHI, eGujCop, AFIS, NAFIS

Provides deterministic, seeded responses for all 5 external databases.
All data is synthetic and for demonstration purposes only.

API Endpoints:
  GET /vahan/vehicle/{plate}          — Vehicle registration data
  GET /sarthi/license/{dl_number}     — Driver license data
  POST /egujcop/search                — CCTNS criminal search
  POST /afis/match                    — Fingerprint matching
  POST /nafis/search                  — National automated fingerprint search
  GET /health                         — Health check
"""

from __future__ import annotations

import hashlib
import random
import re
from datetime import date, datetime, timedelta
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Seed for deterministic responses
SEED = int(__import__("os").getenv("SEED", "42"))
rng = random.Random(SEED)

app = FastAPI(title="Sentinel Mock External APIs", version="1.0.0")

# ── Synthetic data generators ─────────────────────────────────────────────────

VEHICLE_MAKES = ["Maruti Suzuki", "Hyundai", "Tata Motors", "Mahindra", "Honda",
                  "Toyota", "Bajaj", "Hero MotoCorp", "TVS Motor", "KTM"]
VEHICLE_CLASSES = ["LMV", "HMV", "MCWG", "LGV", "TRANS"]
FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"]
COLOURS = ["White", "Silver", "Black", "Grey", "Blue", "Red", "Green", "Gold"]

GUJARAT_DISTRICTS = [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar",
    "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Mehsana",
]

FIRST_NAMES = ["Rajesh", "Suresh", "Amit", "Priya", "Kavita", "Mohan", "Sanjay",
               "Ravi", "Meena", "Geeta", "Ramesh", "Haresh", "Bhavesh", "Nilesh"]
LAST_NAMES = ["Patel", "Shah", "Modi", "Desai", "Mehta", "Joshi", "Trivedi",
              "Gandhi", "Parikh", "Vyas", "Nair", "Singh", "Sharma", "Gupta"]

CRIME_TYPES = ["Theft", "Assault", "Drug Trafficking", "Robbery", "Fraud",
               "Kidnapping", "Vehicle Theft", "Murder (Accused)", "Cheating"]

WATCHLIST_REASONS = [
    "stolen_vehicle", "wanted_criminal", "missing_person",
    "blacklisted_vehicle", "suspect"
]


def deterministic_rng(seed_str: str) -> random.Random:
    """Create a deterministic RNG based on a string seed."""
    seed_int = int(hashlib.md5(f"{SEED}{seed_str}".encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed_int)


def fake_name(r: random.Random) -> str:
    return f"{r.choice(FIRST_NAMES)} {r.choice(LAST_NAMES)}"


def fake_address(r: random.Random) -> str:
    streets = ["MG Road", "Station Road", "NH-48", "Sardar Patel Marg",
               "Nehru Nagar", "Gandhi Chowk", "Ring Road", "Bypass Highway"]
    district = r.choice(GUJARAT_DISTRICTS)
    return f"{r.randint(1, 999)}, {r.choice(streets)}, {district}, Gujarat - {r.randint(380001, 395999)}"


def plate_is_stolen(plate: str) -> bool:
    """Deterministically decide if a plate is stolen (5% of plates)."""
    r = deterministic_rng(f"stolen:{plate}")
    return r.random() < 0.05


def plate_is_blacklisted(plate: str) -> bool:
    """Deterministically decide if a plate is blacklisted (3% of plates)."""
    r = deterministic_rng(f"blacklisted:{plate}")
    return r.random() < 0.03


# ── VAHAN API ──────────────────────────────────────────────────────────────────

@app.get("/vahan/vehicle/{plate_number}")
async def get_vehicle_registration(
    plate_number: str,
    x_api_token: str | None = Header(None),
) -> dict[str, Any]:
    """
    Mock VAHAN vehicle registration database.
    Returns vehicle registration details for any Gujarat plate.
    """
    # Normalise plate
    plate = re.sub(r"\s+", " ", plate_number.strip().upper())

    r = deterministic_rng(f"vahan:{plate}")

    # Validate Gujarat plate format
    if not re.match(r"^GJ\s?\d{2}\s?[A-Z]{2}\s?\d{4}$", plate.replace(" ", "")):
        # Non-Gujarat plate — return minimal data
        return {
            "status": "found",
            "plate_number": plate,
            "state": "Non-Gujarat",
            "data": None,
        }

    reg_date = date(2015, 1, 1) + timedelta(days=r.randint(0, 3000))
    fitness_years = r.randint(3, 10)

    owner_name = fake_name(r)
    address = fake_address(r)
    make = r.choice(VEHICLE_MAKES)
    is_stolen = plate_is_stolen(plate)
    is_blacklisted = plate_is_blacklisted(plate)

    return {
        "status": "found",
        "plate_number": plate,
        "registration_number": plate,
        "owner_name": owner_name,
        "owner_address": address,
        "vehicle_class": r.choice(VEHICLE_CLASSES),
        "fuel_type": r.choice(FUEL_TYPES),
        "manufacturer": make,
        "model": f"{make} {r.choice(['Swift', 'Alto', 'Nexon', 'Creta', 'Safari'])}",
        "color": r.choice(COLOURS),
        "engine_number": f"ENG{r.randint(100000, 999999)}",
        "chassis_number": f"CH{r.randint(1000000, 9999999)}",
        "registration_date": reg_date.isoformat(),
        "fitness_expiry": (reg_date + timedelta(days=365 * fitness_years)).isoformat(),
        "insurance_expiry": (date.today() + timedelta(days=r.randint(-30, 365))).isoformat(),
        "tax_paid_till": (date.today() + timedelta(days=r.randint(-10, 365))).isoformat(),
        "rto_code": f"GJ-{r.randint(1, 25):02d}",
        "rto_office": r.choice(GUJARAT_DISTRICTS),
        "is_stolen": is_stolen,
        "is_blacklisted": is_blacklisted,
        "stolen_date": (date.today() - timedelta(days=r.randint(1, 90))).isoformat() if is_stolen else None,
        "case_number": f"GJ/CR/{r.randint(1000, 9999)}/2026" if is_stolen else None,
        "blacklist_reason": "Court order" if is_blacklisted else None,
        "hypothecation": r.choice([None, f"{r.choice(['SBI', 'HDFC', 'ICICI', 'Axis'])} Bank"]),
        "source": "VAHAN_MOCK",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ── SARTHI API ─────────────────────────────────────────────────────────────────

@app.get("/sarthi/license/{dl_number}")
async def get_driving_license(dl_number: str) -> dict[str, Any]:
    """Mock SARTHI driving license database."""
    r = deterministic_rng(f"sarthi:{dl_number}")
    issue_date = date(2010, 1, 1) + timedelta(days=r.randint(0, 4000))

    return {
        "status": "found",
        "dl_number": dl_number.upper(),
        "holder_name": fake_name(r),
        "date_of_birth": str(date(1970, 1, 1) + timedelta(days=r.randint(0, 15000))),
        "blood_group": r.choice(["A+", "B+", "O+", "AB+", "A-", "B-", "O-"]),
        "address": fake_address(r),
        "issue_date": issue_date.isoformat(),
        "expiry_date": (issue_date + timedelta(days=365 * 20)).isoformat(),
        "license_class": r.choice(["LMV", "MCWG", "TRANS", "HMV"]),
        "is_valid": r.random() > 0.05,
        "rto_office": r.choice(GUJARAT_DISTRICTS),
        "source": "SARTHI_MOCK",
    }


# ── eGujCop API ───────────────────────────────────────────────────────────────

class EGujCopSearchRequest(BaseModel):
    query: str
    search_type: str = "name"  # name | fir_number | aadhar | mobile


@app.post("/egujcop/search")
async def search_egujcop(request: EGujCopSearchRequest) -> dict[str, Any]:
    """Mock eGujCop (CCTNS) criminal database search."""
    r = deterministic_rng(f"egujcop:{request.query}")
    has_record = r.random() < 0.15  # 15% chance of finding a record

    if not has_record:
        return {"status": "not_found", "records": []}

    records = []
    n_records = r.randint(1, 3)
    for _ in range(n_records):
        records.append({
            "fir_number": f"GJ/CR/{r.randint(1000, 9999)}/2026",
            "police_station": f"{r.choice(GUJARAT_DISTRICTS)} PS",
            "crime_type": r.choice(CRIME_TYPES),
            "date_of_incident": str(date.today() - timedelta(days=r.randint(10, 500))),
            "accused_name": fake_name(r),
            "status": r.choice(["Arrested", "Absconding", "On Bail", "Chargesheeted"]),
            "warrant_issued": r.random() > 0.5,
            "is_wanted": r.random() > 0.7,
        })

    return {
        "status": "found",
        "query": request.query,
        "records": records,
        "source": "EGUJCOP_MOCK",
    }


# ── AFIS API ───────────────────────────────────────────────────────────────────

class AFISMatchRequest(BaseModel):
    fingerprint_template: str  # Base64-encoded template
    threshold: float = 0.85


@app.post("/afis/match")
async def afis_fingerprint_match(request: AFISMatchRequest) -> dict[str, Any]:
    """Mock AFIS (Automated Fingerprint Identification System)."""
    r = deterministic_rng(f"afis:{request.fingerprint_template[:20]}")
    matched = r.random() < 0.10  # 10% match rate

    return {
        "matched": matched,
        "confidence": r.uniform(0.86, 0.99) if matched else r.uniform(0.0, 0.75),
        "matched_id": f"AFIS-{r.randint(100000, 999999)}" if matched else None,
        "matched_name": fake_name(r) if matched else None,
        "criminal_record": matched and r.random() > 0.5,
        "source": "AFIS_MOCK",
    }


# ── NAFIS API ──────────────────────────────────────────────────────────────────

class NAFISSearchRequest(BaseModel):
    fingerprint_template: str
    case_number: str | None = None


@app.post("/nafis/search")
async def nafis_search(request: NAFISSearchRequest) -> dict[str, Any]:
    """Mock NAFIS (National Automated Fingerprint Identification System)."""
    r = deterministic_rng(f"nafis:{request.fingerprint_template[:20]}")
    matched = r.random() < 0.08  # 8% match rate

    return {
        "matched": matched,
        "nafis_id": f"NAFIS-{r.randint(1000000, 9999999)}" if matched else None,
        "confidence": r.uniform(0.87, 0.99) if matched else 0.0,
        "matched_state": r.choice(["Gujarat", "Rajasthan", "MP", "Maharashtra"]) if matched else None,
        "criminal_history": {
            "has_record": matched and r.random() > 0.3,
            "crimes": [r.choice(CRIME_TYPES)] if matched else [],
        },
        "source": "NAFIS_MOCK",
    }


# ── Watchlist sync endpoint ──────────────────────────────────────────────────

@app.get("/egujcop/watchlist")
async def get_watchlist() -> dict[str, Any]:
    """
    Get full watchlist from eGujCop for initial seeding.
    Returns wanted vehicles and persons.
    """
    watchlist = []

    # 20 vehicles on watchlist
    for i in range(20):
        r = deterministic_rng(f"watchlist_vehicle:{i}")
        dist = r.randint(1, 25)
        series = "".join(r.choices("ABCDEFGHJKLMNPRSTUVWXYZ", k=2))
        num = r.randint(1000, 9999)
        plate = f"GJ {dist:02d} {series} {num}"

        watchlist.append({
            "type": r.choice(["stolen_vehicle", "blacklisted_vehicle"]),
            "identifier": plate,
            "description": f"Plate {plate} — {r.choice(CRIME_TYPES)}",
            "case_number": f"GJ/CR/{r.randint(1000, 9999)}/2026",
            "priority": r.choice(["medium", "high", "critical"]),
            "source": "egujcop",
            "source_id": f"CCTNS-{r.randint(10000, 99999)}",
        })

    # 10 wanted persons
    for i in range(10):
        r = deterministic_rng(f"watchlist_person:{i}")
        watchlist.append({
            "type": "wanted_person",
            "identifier": fake_name(r),
            "description": f"Wanted for {r.choice(CRIME_TYPES)}",
            "case_number": f"GJ/CR/{r.randint(1000, 9999)}/2026",
            "priority": r.choice(["high", "critical"]),
            "source": "egujcop",
            "source_id": f"CCTNS-{r.randint(10000, 99999)}",
        })

    return {
        "total": len(watchlist),
        "watchlist": watchlist,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "healthy",
        "services": ["vahan", "sarthi", "egujcop", "afis", "nafis"],
        "note": "These are MOCK APIs for demonstration only",
    }


if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", "8090"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
