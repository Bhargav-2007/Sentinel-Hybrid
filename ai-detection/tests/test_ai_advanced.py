"""
Comprehensive test suite for Advanced AI Capabilities:
- Multi-Frame Temporal OCR Fusion
- Vehicle Attribute Extraction (Color & Motion Direction)
- Surveillance Anomaly Detection
- Model Registry & Governance
- Hardware Telemetry & Endpoints
"""

import pytest
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import BoundingBox, DetectedObject
from app.ocr.temporal_fusion import TemporalOCRFusion, levenshtein_distance
from app.detectors.attributes import VehicleAttributeExtractor
from app.detectors.anomalies import SurveillanceAnomalyDetector
from app.utils.model_registry import ModelRegistry
from app.utils.scheduler import InferenceScheduler, GpuResourceManager

client = TestClient(app)


def test_levenshtein_distance():
    assert levenshtein_distance("GJ01AB1234", "GJ01AB1234") == 0
    assert levenshtein_distance("GJ01AB1234", "GJ01AB1284") == 1
    assert levenshtein_distance("GJ01AB1234", "MH02CD5678") > 4


def test_temporal_ocr_fusion_voting():
    fusion = TemporalOCRFusion()
    
    # Simulate a stream with minor character noise:
    # 4 frames with 'GJ01AB1234' and 1 frame with OCR misread 'GJ01AB1284'
    obs_list = ["GJ01AB1234", "GJ01AB1234", "GJ01AB1284", "GJ01AB1234", "GJ01AB1234"]
    result = None
    for obs in obs_list:
        result = fusion.add_observation(
            camera_id="CAM-01",
            track_id=42,
            raw_text=obs,
            clean_plate=obs,
            confidence=0.92,
        )

    assert result is not None
    assert result.plate_number == "GJ01AB1234"
    assert result.supporting_frames == 5  # all within edit distance 1
    assert result.total_frames_evaluated == 5
    assert result.support_ratio == 1.0
    assert result.is_valid_indian_format is True
    assert result.state_code == "GJ"
    assert result.rto_code == "01"


def test_vehicle_attribute_color_extraction():
    extractor = VehicleAttributeExtractor()
    
    # Create synthetic frame with solid red vehicle rectangle
    frame = np.zeros((400, 600, 3), dtype=np.uint8)
    frame[100:300, 150:450] = (20, 20, 220)  # BGR for Red
    
    bbox = BoundingBox(
        x1=150.0, y1=100.0, x2=450.0, y2=300.0,
        width=300.0, height=200.0,
        center_x=300.0, center_y=200.0,
    )
    
    color, conf = extractor.extract_color(frame, bbox)
    assert color == "RED"
    assert conf >= 0.50


def test_vehicle_motion_direction_and_speed():
    extractor = VehicleAttributeExtractor()
    
    bbox1 = BoundingBox(x1=100, y1=100, x2=200, y2=200, width=100, height=100, center_x=150, center_y=150)
    bbox2 = BoundingBox(x1=100, y1=250, x2=200, y2=350, width=100, height=100, center_x=150, center_y=300)
    
    extractor.update_motion("CAM-01", 1, bbox1, pts_ms=1000)
    direction, speed_kmh, conf = extractor.update_motion("CAM-01", 1, bbox2, pts_ms=2000)
    
    assert "SOUTHBOUND" in direction or "APPROACHING" in direction
    assert speed_kmh >= 0.0
    assert conf >= 0.50


def test_anomaly_detection_camera_tampering():
    detector = SurveillanceAnomalyDetector()
    
    # Blacked-out frame
    black_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    events = detector.evaluate_frame_anomalies(black_frame, "CAM-01", [])
    
    tamper_events = [e for e in events if e.anomaly_type == "CAMERA_TAMPERING"]
    assert len(tamper_events) > 0
    assert tamper_events[0].severity in ("CRITICAL", "HIGH")


def test_anomaly_detection_zone_intrusion():
    detector = SurveillanceAnomalyDetector()
    synthetic_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    obj = DetectedObject(
        class_id=0,
        class_name="person",
        confidence=0.95,
        bbox=BoundingBox(x1=150, y1=150, x2=180, y2=250, width=30, height=100, center_x=165, center_y=200),
        track_id=7,
    )
    
    restricted_zones = [
        {
            "name": "AIRPORT_PERIMETER",
            "polygon": [(100.0, 100.0), (300.0, 100.0), (300.0, 300.0), (100.0, 300.0)]
        }
    ]
    
    events = detector.evaluate_frame_anomalies(
        synthetic_frame,
        "CAM-01",
        [obj],
        restricted_zones=restricted_zones
    )
    
    intrusion_events = [e for e in events if e.anomaly_type == "ZONE_INTRUSION"]
    assert len(intrusion_events) == 1
    assert "AIRPORT_PERIMETER" in intrusion_events[0].description


def test_model_registry_inventory():
    registry = ModelRegistry()
    models = registry.list_models()
    assert len(models) >= 4
    
    yolo_meta = registry.get_model("yolo_vehicle_person")
    assert yolo_meta is not None
    assert yolo_meta.map50 > 0.80
    assert yolo_meta.lifecycle_status == "production"


def test_api_attributes_endpoint():
    response = client.post("/detect/attributes", json={
        "camera_id": "CAM-TEST",
        "return_annotated_image": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "attributes" in data


def test_api_anomalies_endpoint():
    response = client.post("/detect/anomalies", json={
        "camera_id": "CAM-TEST",
        "return_annotated_image": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "anomalies" in data


def test_api_fusion_plates_endpoint():
    response = client.post("/fusion/plates", json={
        "camera_id": "CAM-AHM-01",
        "track_id": 99,
        "plate_observations": ["GJ01AB1234", "GJ01AB1234", "GJ01AB1284", "GJ01AB1234"],
        "confidences": [0.95, 0.96, 0.70, 0.98],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["fused_plate"] == "GJ01AB1234"
    assert data["supporting_frames"] == 4
    assert data["support_ratio"] == 1.0


def test_api_models_registry_endpoint():
    response = client.get("/models/registry")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_models"] >= 4
    assert "hardware_status" in data
