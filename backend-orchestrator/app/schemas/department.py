from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class DepartmentCreate(BaseModel):
    code: str = Field(..., examples=["POLICE"])
    name: str = Field(..., examples=["Gujarat State Police"])
    description: Optional[str] = "State Law Enforcement & Traffic Wing"
    nodal_officer: Optional[str] = "DGP Cyber Command"
    contact_email: Optional[str] = "cybercommand@police.gujarat.gov.in"
    contact_phone: Optional[str] = "+91 79 2325 0000"
    jurisdiction_level: Optional[str] = "Statewide"


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: Optional[str]
    nodal_officer: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    jurisdiction_level: str
    camera_count: Optional[int] = 0
    created_at: datetime
