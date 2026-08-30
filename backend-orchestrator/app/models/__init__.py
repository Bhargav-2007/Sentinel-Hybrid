"""Database models package for Gujarat Sentinel Platform."""

from app.models.officer import Officer, OfficerRole
from app.models.department import Department
from app.models.camera import Camera, CameraStatus, CameraType
from app.models.detection import Detection
from app.models.alert import AlertIncident, AlertSeverity, AlertStatus, AlertType
from app.models.watchlist import WatchlistEntry, WatchlistCategory
from app.models.trajectory import VehicleTrajectory, VehicleEncounter
from app.models.audit import AuditLog, BreakGlassSession

__all__ = [
    "Officer",
    "OfficerRole",
    "Department",
    "Camera",
    "CameraStatus",
    "CameraType",
    "Detection",
    "AlertIncident",
    "AlertSeverity",
    "AlertStatus",
    "AlertType",
    "WatchlistEntry",
    "WatchlistCategory",
    "VehicleTrajectory",
    "VehicleEncounter",
    "AuditLog",
    "BreakGlassSession",
]
