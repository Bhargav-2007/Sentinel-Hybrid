from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.core.security import validate_officer_id_format
from app.models.officer import OfficerRole


class LoginRequest(BaseModel):
    """
    Officer login request schema.
    Strictly accepts Officer Badge ID (e.g. POLICE-AHM-042, ADMIN-GND-001) + Password.
    """
    officer_id: str = Field(..., description="Gujarat Police Officer / Badge ID", examples=["POLICE-AHM-042"])
    password: str = Field(..., min_length=4, description="Officer security password", examples=["Sentinel@2026"])

    @field_validator("officer_id")
    @classmethod
    def check_officer_id(cls, v: str) -> str:
        v = v.strip().upper()
        if not validate_officer_id_format(v):
            raise ValueError("Invalid Officer ID format. Must conform to Gujarat Police Badge standard (e.g. POLICE-AHM-042).")
        return v


class TokenResponse(BaseModel):
    """Secure JWT Token response schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    officer_id: str
    badge_number: str
    role: OfficerRole
    district: str
    department: Optional[str] = "Gujarat Police"


class OfficerResponse(BaseModel):
    """Public Officer profile response."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    officer_id: str
    badge_number: str
    full_name: str
    rank: str
    district: str
    station: Optional[str]
    role: OfficerRole
    department_id: Optional[str]
    is_active: bool
    is_on_duty: bool
    last_login: Optional[datetime]


class BreakGlassRequest(BaseModel):
    """Mandatory operational request schema for emergency privilege escalation."""
    reason: str = Field(..., min_length=15, description="Detailed operational justification for emergency break-glass access", examples=["Critical APB Pursuit - Stolen Black Fortuner heading towards State Highway 8"])
    fir_number: Optional[str] = Field(None, description="Related FIR or General Diary Number", examples=["FIR-2026-CR-0842"])
    scope_district: str = Field("ALL_GUJARAT", description="Target district for emergency feed access", examples=["ALL_GUJARAT"])


class BreakGlassResponse(BaseModel):
    """Break-glass session confirmation schema."""
    session_id: str
    officer_id: str
    is_active: bool
    started_at: datetime
    expires_at: datetime
    message: str
    audit_signature: str
