"""
Comprehensive tests for Central Orchestration & AI Correlation:
- Cross-Camera Bayesian Vehicle Correlation
- Camera Graph Route Reconstruction (Dijkstra Shortest Path)
- Explainable Confidence Engine & Prosecution Evidence Generation
"""

from datetime import datetime, timezone
import pytest

from app.services.cross_camera_correlator import (
    CrossCameraCorrelator,
    VehicleSighting,
    haversine_distance_km,
    string_similarity,
)
from app.services.camera_graph import (
    CameraGraphRouteEngine,
    CameraNode,
    haversine_km,
)
from app.services.confidence_engine import (
    ExplainableConfidenceEngine,
    ConfidenceSignals,
)


def test_haversine_and_string_similarity():
    # Ahmedabad (SG Highway) to Gandhinagar distance is ~25-30 km
    dist = haversine_distance_km(23.0225, 72.5714, 23.2156, 72.6369)
    assert 20.0 < dist < 35.0

    # Plate string similarities
    assert string_similarity("GJ01AB1234", "GJ01AB1234") == 1.0
    assert string_similarity("GJ01AB1234", "GJ 01 AB 1234") == 1.0
    assert string_similarity("GJ01AB1234", "GJ01AB1284") >= 0.90
    assert string_similarity("GJ01AB1234", "MH02CD9999") < 0.40


def test_cross_camera_correlator_positive_match():
    correlator = CrossCameraCorrelator()

    t1 = datetime(2026, 8, 31, 10, 0, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 8, 31, 10, 5, 0, tzinfo=timezone.utc)  # 5 mins later

    sighting1 = VehicleSighting(
        camera_id="1",
        camera_name="SG Highway — Prahladnagar",
        district="Ahmedabad City",
        latitude=23.0125,
        longitude=72.5085,
        plate="GJ01AB1234",
        plate_confidence=0.98,
        vehicle_type="CAR",
        vehicle_color="BLACK",
        timestamp=t1,
    )

    sighting2 = VehicleSighting(
        camera_id="3",
        camera_name="SG Highway — Thaltej",
        district="Ahmedabad City",
        latitude=23.0505,
        longitude=72.5042,
        plate="GJ01AB1234",
        plate_confidence=0.95,
        vehicle_type="CAR",
        vehicle_color="BLACK",
        timestamp=t2,
    )

    result = correlator.correlate(sighting1, sighting2)
    assert result.is_correlated is True
    assert result.association_confidence >= 0.85
    assert result.cloned_plate_risk is False
    assert result.distance_km > 0.0
    assert 20.0 <= result.implied_speed_kmh <= 100.0


def test_cross_camera_correlator_cloned_plate_anomaly():
    correlator = CrossCameraCorrelator()

    t1 = datetime(2026, 8, 31, 10, 0, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 8, 31, 10, 0, 30, tzinfo=timezone.utc)  # only 30s later

    # Sightings in Ahmedabad and Surat (250 km apart in 30 seconds!)
    sighting1 = VehicleSighting(
        camera_id="1",
        camera_name="Ahmedabad Checkpoint",
        district="Ahmedabad City",
        latitude=23.0125,
        longitude=72.5085,
        plate="GJ01AB1234",
        plate_confidence=0.98,
        vehicle_type="CAR",
        vehicle_color="WHITE",
        timestamp=t1,
    )

    sighting2 = VehicleSighting(
        camera_id="99",
        camera_name="Surat Ring Road",
        district="Surat",
        latitude=21.1702,
        longitude=72.8311,
        plate="GJ01AB1234",
        plate_confidence=0.97,
        vehicle_type="CAR",
        vehicle_color="WHITE",
        timestamp=t2,
    )

    result = correlator.correlate(sighting1, sighting2)
    assert result.cloned_plate_risk is True
    assert result.is_correlated is False
    assert "CLONED PLATE ANOMALY" in result.explanation


def test_camera_graph_route_dijkstra():
    engine = CameraGraphRouteEngine()

    path, distance = engine.find_shortest_path_dijkstra("1", "5")
    assert len(path) == 5  # 1 -> 2 -> 3 -> 4 -> 5 along SG Highway
    assert path[0] == "1"
    assert path[-1] == "5"
    assert distance > 10.0


def test_camera_graph_reconstruct_route():
    engine = CameraGraphRouteEngine()

    sightings = [
        {"camera_id": "1", "confidence": 0.98, "timestamp": "2026-08-31T10:00:00Z"},
        {"camera_id": "3", "confidence": 0.95, "timestamp": "2026-08-31T10:04:00Z"},
        {"camera_id": "7", "confidence": 0.92, "timestamp": "2026-08-31T10:20:00Z"},
    ]

    route = engine.reconstruct_route_from_sightings("GJ 01 AB 1234", sightings)
    assert route.vehicle_plate == "GJ 01 AB 1234"
    assert route.origin_camera_id == "1"
    assert route.destination_camera_id == "7"
    assert len(route.segments) == 2
    assert route.total_distance_km > 0.0
    assert route.overall_route_confidence >= 0.80


def test_explainable_confidence_engine_auto_alert():
    engine = ExplainableConfidenceEngine()

    signals = ConfidenceSignals(
        detection_conf=0.98,
        tracking_conf=0.95,
        ocr_conf=0.96,
        temporal_conf=0.95,
        appearance_conf=0.90,
        cross_camera_conf=0.92,
        watchlist_conf=0.99,
        route_plausibility_conf=0.91,
    )

    decision = engine.evaluate_alert(
        plate="GJ01AB1234",
        case_number="FIR-2026-CR-0881",
        signals=signals,
        camera_name="SG Highway Junction Cam-01",
        supporting_camera_count=3,
        supporting_frame_count=7,
        total_frame_count=8,
    )

    assert decision.is_actionable_alert is True
    assert decision.triage_action == "AUTOMATIC_ALERT"
    assert decision.final_alert_score >= 0.85
    assert len(decision.evidence_breakdown) == 7
    assert "FIR-2026-CR-0881" in decision.narrative_explanation
