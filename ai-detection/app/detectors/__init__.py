"""AI Object Detectors Package."""

from app.detectors.person_vehicle import PersonVehicleDetector, person_vehicle_detector
from app.detectors.license_plate import LicensePlateDetector, license_plate_detector
from app.detectors.tracker import ByteTrackWrapper, get_tracker_for_camera

__all__ = [
    "PersonVehicleDetector",
    "person_vehicle_detector",
    "LicensePlateDetector",
    "license_plate_detector",
    "ByteTrackWrapper",
    "get_tracker_for_camera",
]
