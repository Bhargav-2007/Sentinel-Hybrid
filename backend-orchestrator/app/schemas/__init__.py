"""Pydantic schemas package for API request validation and serialization."""

from app.schemas.auth import LoginRequest, TokenResponse, OfficerResponse, BreakGlassRequest, BreakGlassResponse
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse, CameraGeoJSONFeatureCollection, CameraOnboardingBatch
from app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse, AlertFilter
from app.schemas.detection import DetectionCreate, DetectionResponse
from app.schemas.tracking import TrajectoryResponse, EncounterResponse
from app.schemas.watchlist import WatchlistCreate, WatchlistResponse, MatchResult
from app.schemas.department import DepartmentCreate, DepartmentResponse
from app.schemas.cost_analysis import CostBenefitReport, InfrastructureSizingResponse

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "OfficerResponse",
    "BreakGlassRequest",
    "BreakGlassResponse",
    "CameraCreate",
    "CameraUpdate",
    "CameraResponse",
    "CameraGeoJSONFeatureCollection",
    "CameraOnboardingBatch",
    "AlertCreate",
    "AlertUpdate",
    "AlertResponse",
    "AlertFilter",
    "DetectionCreate",
    "DetectionResponse",
    "TrajectoryResponse",
    "EncounterResponse",
    "WatchlistCreate",
    "WatchlistResponse",
    "MatchResult",
    "DepartmentCreate",
    "DepartmentResponse",
    "CostBenefitReport",
    "InfrastructureSizingResponse",
]
