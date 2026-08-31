"""
Pydantic schemas for Case Management and Investigation lifecycle.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.models.case import CaseStatus, CasePriority


class CaseCreate(BaseModel):
    title: str = Field(..., min_length=5, description="Case title / summary", examples=["Hotlist Pursuit: Stolen Fortuner GJ01AB1234"])
    description: Optional[str] = Field(None, description="Detailed case narrative")
    fir_number: Optional[str] = Field(None, description="FIR or GD register reference", examples=["FIR-2026-CR-08942"])
    priority: CasePriority = CasePriority.HIGH
    alert_id: Optional[str] = None
    target_plate: Optional[str] = Field(None, examples=["GJ01AB1234"])
    target_vehicle_make: Optional[str] = None
    target_vehicle_model: Optional[str] = None
    target_vehicle_color: Optional[str] = None
    target_person_description: Optional[str] = None
    district: Optional[str] = "Ahmedabad City"
    station: Optional[str] = "Navrangpura Police Station"
    primary_latitude: Optional[float] = 23.0225
    primary_longitude: Optional[float] = 72.5714
    sightings: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    snapshots: Optional[List[str]] = Field(default_factory=list)
    video_clips: Optional[List[str]] = Field(default_factory=list)


class CaseStatusUpdate(BaseModel):
    status: CaseStatus
    note: Optional[str] = Field(None, description="Officer justification or case status note")


class CaseAddEvidence(BaseModel):
    evidence_package: Dict[str, Any]
    note: Optional[str] = None


class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_number: str
    title: str
    description: Optional[str]
    fir_number: Optional[str]
    status: CaseStatus
    priority: CasePriority
    alert_id: Optional[str]
    target_plate: Optional[str]
    target_vehicle_make: Optional[str]
    target_vehicle_model: Optional[str]
    target_vehicle_color: Optional[str]
    target_person_description: Optional[str]
    district: str
    station: str
    primary_latitude: Optional[float]
    primary_longitude: Optional[float]
    assigned_officer_badge: str
    assigned_officer_name: str
    sightings: List[Dict[str, Any]] = Field(default_factory=list)
    evidence_packages: List[Dict[str, Any]] = Field(default_factory=list)
    snapshots: List[str] = Field(default_factory=list)
    video_clips: List[str] = Field(default_factory=list)
    section65b_certificate_id: Optional[str]
    hmac_sha256_signature: Optional[str]
    case_notes: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime]
    resolved_at: Optional[datetime]
