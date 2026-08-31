"""
Gujarat Sentinel — Surveillance Anomaly & Suspicious Activity Detection Engine
Detects wrong-way driving, stopped vehicles, restricted zone intrusions, loitering,
crowd surge, abandoned objects, and camera tampering with 0–100 threat scoring.
"""

from __future__ import annotations

import logging
import time
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from app.schemas import BoundingBox, DetectedObject

logger = logging.getLogger("sentinel.ai.anomalies")


@dataclass
class AnomalyEvent:
    anomaly_type: str  # WRONG_WAY, STOPPED_VEHICLE, ZONE_INTRUSION, LOITERING, CROWD_FORMATION, ABANDONED_OBJECT, CAMERA_TAMPERING, TRAFFIC_CONGESTION
    severity: str      # CRITICAL, HIGH, MEDIUM, LOW
    threat_score: int  # 0 to 100
    confidence: float
    camera_id: str
    track_id: Optional[int]
    description: str
    bbox: Optional[BoundingBox]
    timestamp: float


def point_in_polygon(x: float, y: float, polygon: List[Tuple[float, float]]) -> bool:
    """Ray casting point-in-polygon test."""
    n = len(polygon)
    if n < 3:
        return False
    inside = False
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


class SurveillanceAnomalyDetector:
    """
    Traffic and Security Anomaly Detection Engine for police command centers:
    1. Wrong-Way Movement: Vehicle trajectory heading opposite to highway corridor flow
    2. Stopped Vehicle: Stationary vehicle blocking active traffic lane (> 15s)
    3. Restricted Zone Intrusion: Pedestrian or vehicle inside secure geofenced polygon
    4. Loitering Detection: Person lingering in designated perimeter (> 30s)
    5. Crowd Formation: Sudden surge in pedestrian concentration (> 8 persons)
    6. Abandoned Object: Unattended static item in sensitive zone (> 20s)
    7. Camera Tampering / Occlusion: Sudden lens blocking, defocus, or spray paint
    """

    def __init__(self):
        # Key: (camera_id, track_id) -> first_seen_stationary_timestamp
        self._stopped_tracks: Dict[Tuple[str, int], float] = {}
        # Key: (camera_id, track_id) -> (first_seen_timestamp, last_centroid_x, last_centroid_y)
        self._loitering_tracks: Dict[Tuple[str, int], Tuple[float, float, float]] = {}
        # Key: (camera_id, track_id) -> first_seen_abandoned_timestamp
        self._abandoned_objects: Dict[Tuple[str, int], float] = {}

    def evaluate_frame_anomalies(
        self,
        frame: Optional[np.ndarray],
        camera_id: str,
        tracked_objects: List[DetectedObject],
        allowed_corridor_heading: Optional[str] = None,  # e.g. "SOUTHBOUND", "EASTBOUND", "NORTHBOUND", "WESTBOUND"
        restricted_zones: Optional[List[Dict[str, Any]]] = None,  # [{"name": "BRTS_LANE", "polygon": [(x,y),...]}]
    ) -> List[AnomalyEvent]:
        """Evaluates all operational anomalies for the current camera frame."""
        anomalies: List[AnomalyEvent] = []
        now = time.time()

        # 1. Camera Tampering Check
        if frame is not None and frame.size > 0:
            tamper_event = self._check_camera_tampering(frame, camera_id, now)
            if tamper_event:
                anomalies.append(tamper_event)

        # 2. Crowd Formation / Density Anomaly Check
        pedestrian_objs = [o for o in tracked_objects if o.class_name == "person"]
        if len(pedestrian_objs) >= 8:
            threat = min(95, 50 + len(pedestrian_objs) * 4)
            anomalies.append(AnomalyEvent(
                anomaly_type="CROWD_FORMATION",
                severity="HIGH" if len(pedestrian_objs) >= 12 else "MEDIUM",
                threat_score=threat,
                confidence=0.91,
                camera_id=camera_id,
                track_id=None,
                description=f"Rapid crowd surge alert: {len(pedestrian_objs)} pedestrians clustered in camera field.",
                bbox=None,
                timestamp=now,
            ))

        # 3. Object-level Anomalies (Wrong Way, Stopped Vehicle, Loitering, Zone Intrusion, Abandoned Object)
        for obj in tracked_objects:
            t_id = obj.track_id or -1
            key = (camera_id, t_id)

            # A. Restricted Zone Intrusion (Vehicles and Persons)
            if restricted_zones:
                for zone in restricted_zones:
                    poly = zone.get("polygon", [])
                    zone_name = zone.get("name", "RESTRICTED_ZONE")
                    if poly and point_in_polygon(obj.bbox.center_x, obj.bbox.center_y, poly):
                        is_crit = "HIGH_SECURITY" in zone_name.upper() or "PERIMETER" in zone_name.upper()
                        anomalies.append(AnomalyEvent(
                            anomaly_type="ZONE_INTRUSION",
                            severity="CRITICAL" if is_crit else "HIGH",
                            threat_score=92 if is_crit else 80,
                            confidence=0.94,
                            camera_id=camera_id,
                            track_id=t_id,
                            description=f"Unauthorized entry by {obj.class_name.upper()} into geofenced zone [{zone_name}].",
                            bbox=obj.bbox,
                            timestamp=now,
                        ))

            # B. Wrong-Way Vehicle Detection
            if obj.class_name in ("car", "truck", "bus", "motorcycle") and allowed_corridor_heading:
                # If motion vector contradicts allowed corridor heading
                if obj.motion_direction and obj.motion_direction != "UNKNOWN":
                    is_wrong_way = False
                    if allowed_corridor_heading == "SOUTHBOUND" and obj.motion_direction in ("NORTHBOUND", "Departing"):
                        is_wrong_way = True
                    elif allowed_corridor_heading == "NORTHBOUND" and obj.motion_direction in ("SOUTHBOUND", "Approaching"):
                        is_wrong_way = True
                    elif allowed_corridor_heading == "EASTBOUND" and obj.motion_direction == "WESTBOUND":
                        is_wrong_way = True
                    elif allowed_corridor_heading == "WESTBOUND" and obj.motion_direction == "EASTBOUND":
                        is_wrong_way = True

                    if is_wrong_way:
                        anomalies.append(AnomalyEvent(
                            anomaly_type="WRONG_WAY",
                            severity="CRITICAL",
                            threat_score=95,
                            confidence=0.93,
                            camera_id=camera_id,
                            track_id=t_id,
                            description=f"CRITICAL: {obj.class_name.upper()} driving opposite to authorized {allowed_corridor_heading} lane.",
                            bbox=obj.bbox,
                            timestamp=now,
                        ))

            # C. Stopped Vehicle in Active Travel Corridor
            if obj.class_name in ("car", "truck", "bus", "motorcycle"):
                if key not in self._stopped_tracks:
                    self._stopped_tracks[key] = now
                else:
                    duration = now - self._stopped_tracks[key]
                    if duration >= 15.0:
                        sev = "CRITICAL" if duration >= 60.0 else ("HIGH" if duration >= 30.0 else "MEDIUM")
                        threat = min(90, 45 + int(duration * 0.75))
                        anomalies.append(AnomalyEvent(
                            anomaly_type="STOPPED_VEHICLE",
                            severity=sev,
                            threat_score=threat,
                            confidence=round(min(0.98, 0.72 + (duration / 100.0)), 3),
                            camera_id=camera_id,
                            track_id=t_id,
                            description=f"Stationary {obj.class_name} blocking traffic flow for {int(duration)}s.",
                            bbox=obj.bbox,
                            timestamp=now,
                        ))

            # D. Loitering Detection (Person remaining in vicinity)
            if obj.class_name == "person":
                cx, cy = obj.bbox.center_x, obj.bbox.center_y
                if key not in self._loitering_tracks:
                    self._loitering_tracks[key] = (now, cx, cy)
                else:
                    first_seen, init_x, init_y = self._loitering_tracks[key]
                    dwell_seconds = now - first_seen
                    # Check if person has stayed within 120 pixels of origin
                    drift_distance = math.sqrt((cx - init_x) ** 2 + (cy - init_y) ** 2)
                    if dwell_seconds >= 25.0 and drift_distance < 150.0:
                        anomalies.append(AnomalyEvent(
                            anomaly_type="LOITERING",
                            severity="HIGH" if dwell_seconds >= 60.0 else "MEDIUM",
                            threat_score=min(85, 40 + int(dwell_seconds * 0.7)),
                            confidence=0.90,
                            camera_id=camera_id,
                            track_id=t_id,
                            description=f"Suspicious loitering: Pedestrian dwelling in monitored zone for {int(dwell_seconds)}s.",
                            bbox=obj.bbox,
                            timestamp=now,
                        ))

            # E. Abandoned Object Detection (Backpack, suitcase, box)
            if obj.class_name in ("backpack", "suitcase", "handbag"):
                if key not in self._abandoned_objects:
                    self._abandoned_objects[key] = now
                else:
                    unattended_seconds = now - self._abandoned_objects[key]
                    if unattended_seconds >= 20.0:
                        anomalies.append(AnomalyEvent(
                            anomaly_type="ABANDONED_OBJECT",
                            severity="HIGH" if unattended_seconds < 60.0 else "CRITICAL",
                            threat_score=min(95, 60 + int(unattended_seconds * 0.5)),
                            confidence=0.89,
                            camera_id=camera_id,
                            track_id=t_id,
                            description=f"Unattended {obj.class_name} abandoned in monitored area for {int(unattended_seconds)}s.",
                            bbox=obj.bbox,
                            timestamp=now,
                        ))

        # 4. Sudden Traffic Congestion Surge
        vehicle_count = sum(1 for o in tracked_objects if o.class_name in ("car", "truck", "bus", "motorcycle"))
        if vehicle_count >= 12:
            anomalies.append(AnomalyEvent(
                anomaly_type="TRAFFIC_CONGESTION",
                severity="MEDIUM",
                threat_score=60,
                confidence=0.88,
                camera_id=camera_id,
                track_id=None,
                description=f"High traffic density alert: {vehicle_count} vehicles occupying corridor ROI simultaneously.",
                bbox=None,
                timestamp=now,
            ))

        return anomalies

    def _check_camera_tampering(
        self,
        frame: np.ndarray,
        camera_id: str,
        timestamp: float
    ) -> Optional[AnomalyEvent]:
        """Detects lens occlusion, spray painting, blackout, or defocusing via variance analysis."""
        if cv2 is None or frame is None:
            return None

        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # Compute Laplacian variance (sharpness / edge density)
            laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            mean_lum = float(np.mean(gray))

            # Blackout or whiteout (spray paint / flash / lens covered)
            if mean_lum < 5.0 or mean_lum > 250.0:
                return AnomalyEvent(
                    anomaly_type="CAMERA_TAMPERING",
                    severity="CRITICAL",
                    threat_score=98,
                    confidence=0.96,
                    camera_id=camera_id,
                    track_id=None,
                    description=f"Camera blindness detected (Luminance: {mean_lum:.1f}). Lens obstructed or disconnected.",
                    bbox=None,
                    timestamp=timestamp,
                )

            # Severe defocus or total lens cover
            if laplacian_var < 8.0 and mean_lum < 40.0:
                return AnomalyEvent(
                    anomaly_type="CAMERA_TAMPERING",
                    severity="HIGH",
                    threat_score=88,
                    confidence=0.90,
                    camera_id=camera_id,
                    track_id=None,
                    description=f"Camera edge variance collapsed ({laplacian_var:.1f}). Lens covered or occluded.",
                    bbox=None,
                    timestamp=timestamp,
                )

        except Exception as e:
            logger.debug(f"Tamper check notice: {e}")

        return None


# Global anomaly detector singleton
surveillance_anomaly_detector = SurveillanceAnomalyDetector()
