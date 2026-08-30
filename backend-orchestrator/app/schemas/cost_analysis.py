"""Cost-Benefit Analysis and Infrastructure Sizing schemas."""

from typing import Dict, Any
from pydantic import BaseModel


class InfrastructureSizingResponse(BaseModel):
    camera_count: int
    architecture_tier: str
    bandwidth_profile: Dict[str, Any]
    compute_recommendation: Dict[str, Any]
    storage_projections: Dict[str, Any]


class CostBenefitReport(BaseModel):
    evaluation_scale: str
    traditional_centralized_model: Dict[str, Any]
    sentinel_hybrid_federation_model: Dict[str, Any]
    financial_savings_summary: Dict[str, Any]
