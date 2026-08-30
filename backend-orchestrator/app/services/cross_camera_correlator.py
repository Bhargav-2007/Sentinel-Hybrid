"""
Gujarat Sentinel — Cross-Camera Vehicle Correlation Engine
Computes multi-signal Bayesian association across heterogeneous CCTV camera checkpoints.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (math.sin(dphi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def string_similarity(s1: str, s2: str) -> float:
    """Computes normalized Levenshtein similarity [0.0, 1.0]."""
    s1, s2 = s1.upper().replace(" ", ""), s2.upper().replace(" ", "")
    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    max_len = max(len(s1), len(s2))
    # Levenshtein calculation
    dp = [[0] * (len(s2) + 1) for _ in range(len(s1) + 1)]
    for i in range(len(s1) + 1):
        dp[i][0] = i
    for j in range(len(s2) + 1):
        dp[0][j] = j

    for i in range(1, len(s1) + 1):
        for j in range(1, len(s2) + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    dist = dp[len(s1)][len(s2)]
    return max(0.0, 1.0 - (dist / float(max_len)))


@dataclass
class VehicleSighting:
    camera_id: str
    camera_name: str
    district: str
    latitude: float
    longitude: float
    plate: str
    plate_confidence: float
    vehicle_type: str
    vehicle_color: Optional[str]
    timestamp: datetime
    pts_ms: Optional[int] = None


@dataclass
class CorrelationScore:
    is_correlated: bool
    association_confidence: float
    plate_similarity: float
    color_match: float
    vehicle_type_match: float
    spatial_temporal_plausibility: float
    implied_speed_kmh: float
    distance_km: float
    time_delta_seconds: float
    cloned_plate_risk: bool
    explanation: str


class CrossCameraCorrelator:
    """
    Cross-Camera Vehicle Correlation Engine.
    Correlates sightings of vehicles across physical camera nodes considering:
    1. Plate text similarity (Levenshtein)
    2. Vehicle body color and class agreement
    3. Spatial-temporal travel feasibility (Haversine distance vs elapsed time)
    """

    def __init__(
        self,
        plate_weight: float = 0.45,
        color_weight: float = 0.15,
        type_weight: float = 0.10,
        spatiotemporal_weight: float = 0.30,
        max_feasible_speed_kmh: float = 160.0,
    ):
        self.plate_weight = plate_weight
        self.color_weight = color_weight
        self.type_weight = type_weight
        self.spatiotemporal_weight = spatiotemporal_weight
        self.max_feasible_speed_kmh = max_feasible_speed_kmh

    def correlate(
        self,
        sighting_a: VehicleSighting,
        sighting_b: VehicleSighting,
    ) -> CorrelationScore:
        """Computes multi-dimensional association score between two camera sightings."""
        # 1. Plate text similarity
        plate_sim = string_similarity(sighting_a.plate, sighting_b.plate)

        # 2. Color similarity
        if sighting_a.vehicle_color and sighting_b.vehicle_color:
            c1 = sighting_a.vehicle_color.upper()
            c2 = sighting_b.vehicle_color.upper()
            color_sim = 1.0 if c1 == c2 else (0.4 if {c1, c2} <= {"WHITE", "SILVER", "GRAY"} else 0.1)
        else:
            color_sim = 0.70  # neutral if unknown

        # 3. Vehicle class similarity
        t1 = sighting_a.vehicle_type.upper()
        t2 = sighting_b.vehicle_type.upper()
        type_sim = 1.0 if t1 == t2 else (0.5 if {t1, t2} <= {"CAR", "SUV", "VAN"} else 0.1)

        # 4. Spatiotemporal Plausibility
        dist_km = haversine_distance_km(
            sighting_a.latitude, sighting_a.longitude,
            sighting_b.latitude, sighting_b.longitude
        )
        dt_seconds = abs((sighting_b.timestamp - sighting_a.timestamp).total_seconds())
        if dt_seconds < 1.0:
            dt_seconds = 1.0

        implied_speed = (dist_km / (dt_seconds / 3600.0))

        # Check for cloned plate anomaly (impossible simultaneous sightings far apart)
        cloned_plate_risk = False
        if dist_km > 5.0 and implied_speed > self.max_feasible_speed_kmh:
            st_plausibility = 0.05
            cloned_plate_risk = True
        elif dist_km < 0.1:
            st_plausibility = 0.95
        else:
            # Ideal corridor speed between 20 km/h and 100 km/h
            if 15.0 <= implied_speed <= 120.0:
                st_plausibility = 0.95
            elif implied_speed < 15.0:
                st_plausibility = 0.85  # plausible stopped/traffic
            else:
                st_plausibility = max(0.20, 1.0 - (implied_speed - 120.0) / 60.0)

        # Weighted aggregate association score
        association_conf = (
            self.plate_weight * plate_sim +
            self.color_weight * color_sim +
            self.type_weight * type_sim +
            self.spatiotemporal_weight * st_plausibility
        )
        association_conf = round(min(0.99, max(0.01, association_conf)), 3)
        is_match = association_conf >= 0.72 and not cloned_plate_risk

        # Explanation text
        if cloned_plate_risk:
            explanation = (
                f"🚨 CLONED PLATE ANOMALY: Same plate sighted {dist_km:.1f} km apart in {int(dt_seconds)}s "
                f"(Implied speed: {implied_speed:.1f} km/h > limit {self.max_feasible_speed_kmh} km/h)."
            )
        elif is_match:
            explanation = (
                f"✓ Correlated sighting across {sighting_a.camera_name} and {sighting_b.camera_name}: "
                f"Plate match {plate_sim:.0%}, Color: {sighting_a.vehicle_color or 'N/A'}, "
                f"Speed: {implied_speed:.1f} km/h over {dist_km:.2f} km."
            )
        else:
            explanation = (
                f"Inconclusive correlation (Score: {association_conf:.2f}). "
                f"Plate similarity: {plate_sim:.0%}, Implied speed: {implied_speed:.1f} km/h."
            )

        return CorrelationScore(
            is_correlated=is_match,
            association_confidence=association_conf,
            plate_similarity=round(plate_sim, 3),
            color_match=round(color_sim, 3),
            vehicle_type_match=round(type_sim, 3),
            spatial_temporal_plausibility=round(st_plausibility, 3),
            implied_speed_kmh=round(implied_speed, 1),
            distance_km=round(dist_km, 3),
            time_delta_seconds=round(dt_seconds, 1),
            cloned_plate_risk=cloned_plate_risk,
            explanation=explanation,
        )


# Global cross camera correlator singleton
cross_camera_correlator = CrossCameraCorrelator()
