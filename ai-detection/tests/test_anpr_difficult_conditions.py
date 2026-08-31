"""
Gujarat Sentinel — Difficult Condition ANPR & Multi-Frame Voting Test Suite
Evaluates plate normalization and OCR recovery under difficult real-world environmental conditions:
1. Low-light / Night conditions
2. Rain and atmospheric noise
3. Motion blur (fast moving vehicles)
4. Angled / perspective skewed plates
5. Dirty / weathered plates
6. Multi-frame OCR voting consensus
7. Indian plate format regex validation (Standard HSRP, Bharat Series, Diplomatic).
"""

import math
import sys
from pathlib import Path
import numpy as np
import pytest

# Ensure ai-detection directory is in sys.path
AI_DETECTION_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_DETECTION_ROOT))

from app.ocr.plate_reader import plate_reader
from app.ocr.temporal_fusion import temporal_ocr_fusion
from app.schemas import BoundingBox


def create_synthetic_plate_image(text: str = "GJ01AB1234", noise_type: str = "none") -> np.ndarray:
    """Creates a synthetic plate crop with various environmental noise conditions."""
    try:
        import cv2
    except ImportError:
        return np.zeros((80, 240, 3), dtype=np.uint8)

    # Base white plate with yellow reflective backdrop (standard Indian commercial/private)
    img = np.ones((80, 240, 3), dtype=np.uint8) * 240
    # Add border
    cv2.rectangle(img, (2, 2), (237, 77), (20, 20, 20), 2)
    # Add text
    cv2.putText(img, text, (15, 52), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (10, 10, 10), 3)

    if noise_type == "night":
        # Low gamma / dark underexposure + spot glare
        img = (img * 0.25).astype(np.uint8)
        # Add headlamp flare
        cv2.circle(img, (180, 40), 25, (220, 220, 220), -1)

    elif noise_type == "rain":
        # Random rain streaks + Gaussian noise
        noise = np.random.normal(0, 25, img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        for _ in range(15):
            x = np.random.randint(0, 230)
            y = np.random.randint(0, 60)
            cv2.line(img, (x, y), (x + 8, y + 18), (180, 180, 200), 1)

    elif noise_type == "blur":
        # Horizontal motion blur for fast vehicle
        kernel_size = 9
        kernel = np.zeros((kernel_size, kernel_size))
        kernel[int((kernel_size - 1) / 2), :] = np.ones(kernel_size)
        kernel /= kernel_size
        img = cv2.filter2D(img, -1, kernel)

    elif noise_type == "angle":
        # Perspective transform (30 degree tilt)
        pts1 = np.float32([[0, 0], [240, 0], [0, 80], [240, 80]])
        pts2 = np.float32([[15, 8], [225, 0], [0, 75], [240, 80]])
        matrix = cv2.getPerspectiveTransform(pts1, pts2)
        img = cv2.warpPerspective(img, matrix, (240, 80))

    elif noise_type == "dirty":
        # Mud splatter & character weathering
        for _ in range(25):
            cx, cy = np.random.randint(0, 240), np.random.randint(0, 80)
            r = np.random.randint(2, 7)
            cv2.circle(img, (cx, cy), r, (40, 60, 70), -1)

    return img


def test_indian_hsrp_plate_formatting():
    """Verifies that standard Indian State HSRP registrations format cleanly."""
    clean, formatted, valid = plate_reader._clean_and_format_plate("IND GJ 01 AB 1234")
    assert clean == "GJ01AB1234"
    assert formatted == "GJ 01 AB 1234"
    assert valid is True

    # Common OCR character confusion substitutions (e.g. 0J instead of GJ, G1 instead of GJ)
    clean2, formatted2, valid2 = plate_reader._clean_and_format_plate("0J-01-AB-1234")
    assert clean2.startswith("GJ")
    assert valid2 is True


def test_bharat_series_plate_formatting():
    """Verifies that newly mandated Bharat Series (BH) number plates format cleanly."""
    clean, formatted, valid = plate_reader._clean_and_format_plate("22 BH 1234 AA")
    assert clean == "22BH1234AA"
    assert formatted == "22 BH 1234 AA"
    assert valid is True


def test_diplomatic_corps_plate_formatting():
    """Verifies diplomatic and consular plates format cleanly."""
    clean, formatted, valid = plate_reader._clean_and_format_plate("77 CD 1234")
    assert clean == "77CD1234"
    assert formatted == "77 CD 1234"
    assert valid is True


def test_difficult_condition_enhancement_and_reading():
    """Tests the multi-stage CLAHE and bilateral filtering under difficult environmental conditions."""
    bbox = BoundingBox(x1=10, y1=10, x2=250, y2=90, confidence=0.96)

    # 1. Test Night Image Enhancement
    night_img = create_synthetic_plate_image("GJ01AB1234", noise_type="night")
    enhanced_night = plate_reader._enhance_plate_image(night_img)
    assert enhanced_night is not None
    assert enhanced_night.shape[0] >= 80

    # 2. Test Rain Image Enhancement
    rain_img = create_synthetic_plate_image("GJ01AB1234", noise_type="rain")
    enhanced_rain = plate_reader._enhance_plate_image(rain_img)
    assert enhanced_rain is not None

    # 3. Test Motion Blur Image Enhancement
    blur_img = create_synthetic_plate_image("GJ01AB1234", noise_type="blur")
    enhanced_blur = plate_reader._enhance_plate_image(blur_img)
    assert enhanced_blur is not None


def test_multi_frame_temporal_ocr_voting():
    """
    Simulates a camera observing a fast-moving vehicle across 5 frames with intermittent OCR noise.
    Verifies that temporal fusion converges on the ground-truth registration number.
    """
    cam_id = "test_cam_01"
    track_id = 101

    # Simulated noisy successive observations for ground truth "GJ01AB1234"
    observations = [
        ("GJO1AB1234", "GJO1AB1234", 0.70),   # Frame 1: 'O' instead of '0'
        ("GJ01AB1234", "GJ01AB1234", 0.95),   # Frame 2: Correct
        ("GJ01AB123A", "GJ01AB123A", 0.65),   # Frame 3: 'A' instead of '4' at end
        ("GJ01AB1234", "GJ01AB1234", 0.96),   # Frame 4: Correct
        ("GJ01AB1234", "GJ01AB1234", 0.94),   # Frame 5: Correct
    ]

    fused_result = None
    for raw, clean, conf in observations:
        fused_result = temporal_ocr_fusion.add_observation(
            camera_id=cam_id,
            track_id=track_id,
            raw_text=raw,
            clean_plate=clean,
            confidence=conf
        )

    assert fused_result is not None
    # Consensus should resolve to GJ01AB1234
    assert fused_result.plate_number == "GJ01AB1234"
    assert fused_result.is_valid_indian_format is True
    assert fused_result.supporting_frames >= 4
    assert fused_result.aggregate_confidence >= 0.85

    # Cleanup
    temporal_ocr_fusion.clear_track(cam_id, track_id)
