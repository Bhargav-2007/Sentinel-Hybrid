"""
Gujarat Sentinel — Model 2 Unit Tests
Tests ANPR engine, plate normalisation, stream manager, watchlist, and schemas.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
import pytest

from app.schemas.schemas import (
    normalise_plate,
    WatchlistCreateSchema,
    WatchlistTypeEnum,
    AlertPriorityEnum,
    StreamStatusEnum,
    StreamDetailSchema,
    ANPRDetectionSchema,
)
from app.pipeline.anpr_engine import ANPREngine, INDIAN_PLATE_PATTERN, GUJARAT_PLATE_PATTERN


def test_plate_normalisation():
    assert normalise_plate("GJ 01 AB 1234") == "GJ01AB1234"
    assert normalise_plate("gj-01-ab-1234") == "GJ01AB1234"
    assert normalise_plate("  GJ  12   CD   5678  ") == "GJ12CD5678"
    assert normalise_plate("MH02BC9999") == "MH02BC9999"


def test_indian_plate_regex():
    assert INDIAN_PLATE_PATTERN.match("GJ01AB1234") or GUJARAT_PLATE_PATTERN.match("GJ01AB1234")
    assert INDIAN_PLATE_PATTERN.match("GJ 01 AB 1234") or GUJARAT_PLATE_PATTERN.match("GJ 01 AB 1234")
    assert INDIAN_PLATE_PATTERN.match("MH 12 DE 4567")
    assert not INDIAN_PLATE_PATTERN.match("INVALID_PLATE_123")


def test_anpr_engine_plate_validation():
    engine = ANPREngine()
    assert engine._is_valid_plate("GJ01AB1234") is True
    assert engine._is_valid_plate("MH12DE4567") is True
    assert engine._is_valid_plate("XYZ") is False
    assert engine._is_valid_plate("123456789012345") is False


def test_watchlist_create_schema_normalisation():
    schema = WatchlistCreateSchema(
        type=WatchlistTypeEnum.stolen_vehicle,
        identifier="gj 01 ab 1234",
        description="Stolen Hyundai Creta",
        priority=AlertPriorityEnum.critical,
    )
    assert schema.identifier == "GJ 01 AB 1234"
    assert schema.type == WatchlistTypeEnum.stolen_vehicle
    assert schema.priority == AlertPriorityEnum.critical


def test_stream_detail_schema():
    stream = StreamDetailSchema(
        id="stream-01",
        camera_id="CAM-SG-01",
        name="SG Highway Cam 01",
        status=StreamStatusEnum.live,
        rtsp_url="rtsp://localhost:8554/cam/stream-01",
        hls_url="http://localhost:8888/cam/stream-01/index.m3u8",
        analytics_active=True,
    )
    assert stream.status == StreamStatusEnum.live
    assert stream.analytics_active is True
    assert stream.camera_id == "CAM-SG-01"


def test_anpr_detection_schema():
    detection = ANPRDetectionSchema(
        id=uuid.uuid4(),
        camera_id="CAM-01",
        stream_id="stream-01",
        plate_number="GJ01AB1234",
        confidence=0.95,
        timestamp=datetime.now(tz=timezone.utc),
        is_stolen=True,
        is_blacklisted=False,
    )
    assert detection.confidence == 0.95
    assert detection.is_stolen is True
    assert detection.plate_number == "GJ01AB1234"
