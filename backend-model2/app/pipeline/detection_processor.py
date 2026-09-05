"""
Gujarat Sentinel — Model 2
Detection Processor: Orchestrates the full detection pipeline

Flow:
  Frame → ANPR Engine → VAHAN Lookup → Watchlist Check → 
  Store (Postgres + OpenSearch) → Publish (Kafka) → Alert (if watchlist hit)

This is the callback registered with the StreamManager.
Each frame is processed through the full pipeline.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import numpy as np
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import (
    ANPRDetection,
    AlertPriorityEnum,
    WatchlistAlert,
    WatchlistEntry,
)
from app.db.session import get_session_factory
from app.pipeline.anpr_engine import ANPREngine
from app.schemas.schemas import normalise_plate

logger = structlog.get_logger(__name__)


class DetectionProcessor:
    """
    Orchestrates the ANPR detection pipeline from frame to alert.

    Maintains an in-memory watchlist cache (refreshed every 60s)
    for O(1) lookup on every detection without hitting the database.
    """

    def __init__(self):
        self.settings = get_settings()
        self.anpr_engine = ANPREngine()
        self._watchlist_cache: dict[str, dict[str, Any]] = {}
        self._watchlist_last_refresh: float = 0.0
        self._kafka_publisher = None
        self._s3_client = None
        self._opensearch_client = None

    async def initialize(self) -> None:
        """Warm up the ANPR engine and populate watchlist cache."""
        # Load ML models in thread pool (CPU-heavy)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.anpr_engine.initialize)

        # Populate watchlist cache
        await self._refresh_watchlist_cache()

        # Initialize OpenSearch client
        try:
            from opensearchpy import AsyncOpenSearch
            self._opensearch_client = AsyncOpenSearch(
                hosts=[self.settings.opensearch_url],
                use_ssl=False,
                verify_certs=False,
            )
            # Create detection index if not exists
            await self._ensure_opensearch_index()
            logger.info("opensearch_connected")
        except Exception as e:
            logger.warning("opensearch_init_failed", error=str(e)[:100])

        # Initialize S3 client (MinIO)
        try:
            import boto3
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=self.settings.s3_endpoint,
                aws_access_key_id=self.settings.s3_access_key,
                aws_secret_access_key=self.settings.s3_secret_key,
                region_name="us-east-1",
            )
            # Ensure buckets exist
            for bucket in [self.settings.s3_bucket_snapshots, self.settings.s3_bucket_clips]:
                try:
                    self._s3_client.head_bucket(Bucket=bucket)
                except Exception:
                    self._s3_client.create_bucket(Bucket=bucket)
            logger.info("s3_connected")
        except Exception as e:
            logger.warning("s3_init_failed", error=str(e)[:100])

        logger.info("detection_processor_ready")

    async def process_frame(
        self,
        stream_id: str,
        frame: np.ndarray,
        pts_ms: int,
        metadata: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Full detection pipeline callback for StreamManager.

        This is called for every Nth frame from every active stream.
        Must be fast and non-blocking for the critical path.
        """
        # Step 1: Run ANPR (CPU-bound, run in thread pool)
        loop = asyncio.get_event_loop()
        detections = await loop.run_in_executor(
            None,
            self.anpr_engine.process_frame,
            frame,
            pts_ms,
            metadata,
        )

        if not detections:
            return []

        # Step 2: Process each detection (async — DB, VAHAN, Kafka)
        results = []
        for detection in detections:
            try:
                result = await self._process_single_detection(
                    stream_id=stream_id,
                    detection=detection,
                )
                if result:
                    results.append(result)
            except Exception as e:
                logger.error(
                    "detection_processing_error",
                    plate=detection.get("plate_number"),
                    error=str(e)[:200],
                )

        return results

    async def _process_single_detection(
        self,
        stream_id: str,
        detection: dict[str, Any],
    ) -> dict[str, Any] | None:
        """
        Process a single ANPR detection through the full pipeline:
          1. Upload snapshots to S3 (MinIO)
          2. VAHAN cross-reference (async HTTP)
          3. Watchlist check (in-memory O(1))
          4. Store in PostgreSQL
          5. Index in OpenSearch
          6. Publish Kafka event
          7. Generate alert if watchlist hit
        """
        plate = detection["plate_number"]
        plate_display = detection.get("plate_number_display", plate)
        stream_meta = detection.get("stream_metadata", {})
        camera_id = stream_meta.get("camera_id", stream_id)

        detection_id = uuid.uuid4()

        # ── 1. Upload snapshots to S3 ──────────────────────────────────────
        snapshot_url = None
        plate_crop_url = None

        if self._s3_client and detection.get("snapshot_bytes"):
            try:
                snapshot_key = f"detections/{datetime.now(tz=timezone.utc).strftime('%Y/%m/%d')}/{detection_id}_frame.jpg"
                self._s3_client.put_object(
                    Bucket=self.settings.s3_bucket_snapshots,
                    Key=snapshot_key,
                    Body=detection["snapshot_bytes"],
                    ContentType="image/jpeg",
                )
                snapshot_url = f"{self.settings.s3_endpoint}/{self.settings.s3_bucket_snapshots}/{snapshot_key}"
            except Exception as e:
                logger.warning("snapshot_upload_failed", error=str(e)[:100])

        if self._s3_client and detection.get("plate_crop_bytes"):
            try:
                crop_key = f"plates/{datetime.now(tz=timezone.utc).strftime('%Y/%m/%d')}/{detection_id}_plate.jpg"
                self._s3_client.put_object(
                    Bucket=self.settings.s3_bucket_snapshots,
                    Key=crop_key,
                    Body=detection["plate_crop_bytes"],
                    ContentType="image/jpeg",
                )
                plate_crop_url = f"{self.settings.s3_endpoint}/{self.settings.s3_bucket_snapshots}/{crop_key}"
            except Exception as e:
                logger.warning("plate_crop_upload_failed", error=str(e)[:100])

        # ── 2. VAHAN cross-reference ───────────────────────────────────────
        vahan_data = await self._lookup_vahan(plate_display)
        is_stolen = bool(vahan_data and vahan_data.get("is_stolen"))
        is_blacklisted = bool(vahan_data and vahan_data.get("is_blacklisted"))

        # ── 3. Watchlist check ─────────────────────────────────────────────
        watchlist_hit = self._check_watchlist(plate)
        if is_stolen and not watchlist_hit:
            # Auto-add stolen vehicles to generate alert
            watchlist_hit = {
                "type": "stolen_vehicle",
                "priority": "critical",
                "source": "vahan",
            }

        # ── 4. Store in PostgreSQL ─────────────────────────────────────────
        bbox = detection.get("bounding_box", {})
        db_record = ANPRDetection(
            id=detection_id,
            camera_id=camera_id,
            stream_id=stream_id,
            plate_number=plate_display,
            plate_number_normalised=plate,
            confidence=detection["confidence"],
            timestamp=detection["timestamp"],
            pts_ms=detection.get("pts_ms"),
            bbox_x=bbox.get("x"),
            bbox_y=bbox.get("y"),
            bbox_width=bbox.get("width"),
            bbox_height=bbox.get("height"),
            vehicle_type=detection.get("vehicle_type"),
            vehicle_color=detection.get("vehicle_color"),
            vehicle_confidence=detection.get("vehicle_confidence"),
            district=stream_meta.get("district"),
            latitude=stream_meta.get("latitude"),
            longitude=stream_meta.get("longitude"),
            snapshot_url=snapshot_url,
            plate_crop_url=plate_crop_url,
            vahan_data=vahan_data,
            is_stolen=is_stolen,
            is_blacklisted=is_blacklisted,
            processing_time_ms=detection.get("processing_time_ms"),
            model_version="yolov8n+paddleocr",
        )

        factory = get_session_factory()
        async with factory() as db:
            db.add(db_record)

            # ── 7. Generate alert if watchlist hit ─────────────────────────
            if watchlist_hit:
                alert = await self._create_alert(
                    db=db,
                    detection_id=detection_id,
                    plate=plate_display,
                    camera_id=camera_id,
                    watchlist_hit=watchlist_hit,
                    stream_meta=stream_meta,
                    snapshot_url=snapshot_url,
                )
                if alert:
                    logger.warning(
                        "watchlist_alert_triggered",
                        plate=plate_display,
                        camera_id=camera_id,
                        alert_type=watchlist_hit.get("type"),
                        priority=watchlist_hit.get("priority"),
                    )

            await db.commit()

        # ── 5. Index in OpenSearch ─────────────────────────────────────────
        await self._index_detection(detection_id, db_record)

        # ── 6. Publish Kafka event ─────────────────────────────────────────
        await self._publish_detection_event(detection_id, db_record, watchlist_hit)

        return {
            "detection_id": str(detection_id),
            "plate": plate_display,
            "camera_id": camera_id,
            "watchlist_hit": watchlist_hit is not None,
        }

    async def _lookup_vahan(self, plate: str) -> dict[str, Any] | None:
        """Cross-reference plate with VAHAN (vehicle registration) database."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.settings.vahan_api_url}/vehicle/{plate.replace(' ', '%20')}"
                )
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.debug("vahan_lookup_failed", plate=plate[:10], error=str(e)[:50])
        return None

    def _check_watchlist(self, normalised_plate: str) -> dict[str, Any] | None:
        """Check plate against in-memory watchlist cache."""
        return self._watchlist_cache.get(normalised_plate)

    async def _refresh_watchlist_cache(self) -> None:
        """Reload watchlist from database into memory."""
        now = time.monotonic()
        if now - self._watchlist_last_refresh < 60.0 and self._watchlist_cache:
            return  # Cache is still fresh

        try:
            factory = get_session_factory()
            async with factory() as db:
                result = await db.execute(
                    select(WatchlistEntry).where(WatchlistEntry.is_active == True)
                )
                entries = result.scalars().all()

            new_cache: dict[str, dict[str, Any]] = {}
            for entry in entries:
                new_cache[entry.identifier_normalised] = {
                    "id": str(entry.id),
                    "type": entry.type,
                    "priority": entry.priority,
                    "case_number": entry.case_number,
                    "source": entry.source,
                    "description": entry.description,
                }

            self._watchlist_cache = new_cache
            self._watchlist_last_refresh = now
            logger.info("watchlist_cache_refreshed", entries=len(new_cache))
        except Exception as e:
            logger.error("watchlist_cache_refresh_failed", error=str(e)[:100])

    async def _create_alert(
        self,
        db: AsyncSession,
        detection_id: uuid.UUID,
        plate: str,
        camera_id: str,
        watchlist_hit: dict[str, Any],
        stream_meta: dict[str, Any],
        snapshot_url: str | None,
    ) -> WatchlistAlert | None:
        """Create a watchlist alert in the database."""
        watchlist_entry_id = watchlist_hit.get("id")

        if not watchlist_entry_id:
            # Dynamic hit (from VAHAN stolen check) — no DB watchlist entry
            return None

        try:
            alert = WatchlistAlert(
                watchlist_entry_id=uuid.UUID(watchlist_entry_id),
                detection_id=detection_id,
                alert_type=watchlist_hit.get("type", "unknown"),
                plate_number=plate,
                camera_id=camera_id,
                priority=AlertPriorityEnum(watchlist_hit.get("priority", "medium")),
                district=stream_meta.get("district"),
                latitude=stream_meta.get("latitude"),
                longitude=stream_meta.get("longitude"),
                snapshot_url=snapshot_url,
                extra_metadata={"case_number": watchlist_hit.get("case_number")},
            )
            db.add(alert)
            return alert
        except Exception as e:
            logger.error("alert_creation_failed", error=str(e)[:200])
            return None

    async def _index_detection(
        self, detection_id: uuid.UUID, record: ANPRDetection
    ) -> None:
        """Index detection in OpenSearch for full-text search."""
        if self._opensearch_client is None:
            return

        try:
            doc = {
                "detection_id": str(detection_id),
                "camera_id": record.camera_id,
                "stream_id": record.stream_id,
                "plate_number": record.plate_number,
                "plate_number_normalised": record.plate_number_normalised,
                "confidence": record.confidence,
                "timestamp": record.timestamp.isoformat(),
                "vehicle_type": record.vehicle_type,
                "vehicle_color": record.vehicle_color,
                "district": record.district,
                "latitude": record.latitude,
                "longitude": record.longitude,
                "is_stolen": record.is_stolen,
                "is_blacklisted": record.is_blacklisted,
                "snapshot_url": record.snapshot_url,
            }
            await self._opensearch_client.index(
                index=self.settings.opensearch_index_detections,
                body=doc,
                id=str(detection_id),
            )
        except Exception as e:
            logger.warning("opensearch_index_failed", error=str(e)[:100])

    async def _ensure_opensearch_index(self) -> None:
        """Create OpenSearch index with mapping if it doesn't exist."""
        if self._opensearch_client is None:
            return

        index = self.settings.opensearch_index_detections
        try:
            exists = await self._opensearch_client.indices.exists(index=index)
            if not exists:
                await self._opensearch_client.indices.create(
                    index=index,
                    body={
                        "settings": {
                            "number_of_shards": 3,
                            "number_of_replicas": 0,
                        },
                        "mappings": {
                            "properties": {
                                "plate_number": {"type": "keyword"},
                                "plate_number_normalised": {"type": "keyword"},
                                "camera_id": {"type": "keyword"},
                                "stream_id": {"type": "keyword"},
                                "district": {"type": "keyword"},
                                "vehicle_type": {"type": "keyword"},
                                "vehicle_color": {"type": "keyword"},
                                "confidence": {"type": "float"},
                                "timestamp": {"type": "date"},
                                "latitude": {"type": "float"},
                                "longitude": {"type": "float"},
                                "is_stolen": {"type": "boolean"},
                                "is_blacklisted": {"type": "boolean"},
                                "snapshot_url": {"type": "text", "index": False},
                            }
                        },
                    },
                )
                logger.info("opensearch_index_created", index=index)
        except Exception as e:
            logger.warning("opensearch_index_setup_failed", error=str(e)[:100])

    async def _publish_detection_event(
        self,
        detection_id: uuid.UUID,
        record: ANPRDetection,
        watchlist_hit: dict[str, Any] | None,
    ) -> None:
        """
        Publish detection CloudEvent to Kafka sentinel.detection.events topic.

        Falls back to direct HTTP POST to Orchestrator /orchestrator/ingest-detection
        when Kafka is unavailable (dev/demo mode without full Docker stack).
        This ensures the Detection → Alert → WebSocket → Frontend chain always fires.
        """
        import json
        from datetime import datetime, timezone

        event_payload = {
            "specversion": "1.0",
            "type": "sentinel.anpr.detection",
            "source": f"model2/stream/{record.stream_id}",
            "id": str(detection_id),
            "time": datetime.now(timezone.utc).isoformat(),
            "datacontenttype": "application/json",
            "data": {
                "detection_id": str(detection_id),
                "camera_id": record.camera_id,
                "stream_id": record.stream_id,
                "plate_number": record.plate_number,
                "plate_number_normalised": record.plate_number_normalised,
                "confidence": record.confidence,
                "timestamp": record.timestamp.isoformat() if record.timestamp else None,
                "pts_ms": record.pts_ms,
                "vehicle_type": record.vehicle_type,
                "vehicle_color": record.vehicle_color,
                "district": record.district,
                "latitude": record.latitude,
                "longitude": record.longitude,
                "is_stolen": record.is_stolen,
                "is_blacklisted": record.is_blacklisted,
                "snapshot_url": record.snapshot_url,
                "watchlist_hit": watchlist_hit,
            },
        }

        kafka_published = False

        # ── 1. Try Kafka first ─────────────────────────────────────────────
        try:
            from aiokafka import AIOKafkaProducer

            producer = AIOKafkaProducer(
                bootstrap_servers=self.settings.kafka_bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            )
            await producer.start()
            try:
                await producer.send_and_wait(
                    self.settings.topic_detection_events,
                    value=event_payload,
                    key=record.plate_number_normalised.encode("utf-8") if record.plate_number_normalised else None,
                )
                kafka_published = True
                logger.info(
                    "detection_event_published_kafka",
                    detection_id=str(detection_id),
                    plate=record.plate_number,
                    topic=self.settings.topic_detection_events,
                )

                # Also publish alert event if watchlist hit
                if watchlist_hit:
                    alert_event = {
                        **event_payload,
                        "type": "sentinel.watchlist.alert",
                        "data": {
                            **event_payload["data"],
                            "alert_priority": watchlist_hit.get("priority", "medium"),
                            "alert_type": watchlist_hit.get("type", "watchlist_match"),
                            "case_number": watchlist_hit.get("case_number"),
                        },
                    }
                    await producer.send_and_wait(
                        self.settings.topic_alert_events,
                        value=alert_event,
                        key=record.plate_number_normalised.encode("utf-8") if record.plate_number_normalised else None,
                    )
                    logger.warning(
                        "alert_event_published_kafka",
                        plate=record.plate_number,
                        priority=watchlist_hit.get("priority"),
                    )
            finally:
                await producer.stop()

        except asyncio.CancelledError:
            raise
        except Exception as kafka_err:
            logger.warning(
                "kafka_publish_failed_using_http_fallback",
                error=str(kafka_err)[:200],
                plate=record.plate_number,
            )

        # ── 2. HTTP fallback to Orchestrator (works without Kafka/Docker) ──
        if not kafka_published:
            try:
                orchestrator_url = getattr(
                    self.settings,
                    "orchestrator_url",
                    "http://localhost:8005",
                )
                ingest_url = f"{orchestrator_url}/api/v1/orchestrator/ingest-detection"

                payload = {
                    "camera_id": record.camera_id or record.stream_id,
                    "camera_name": f"Camera {record.camera_id}",
                    "district": record.district or "Gujarat",
                    "latitude": record.latitude or 23.0225,
                    "longitude": record.longitude or 72.5714,
                    "detected_plate": record.plate_number,
                    "confidence_score": record.confidence or 0.0,
                    "vehicle_type": record.vehicle_type or "CAR",
                    "vehicle_color": record.vehicle_color,
                    "pts_timestamp_ms": record.pts_ms,
                    "snapshot_url": record.snapshot_url,
                }

                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(ingest_url, json=payload)
                    if resp.status_code in (200, 201):
                        logger.info(
                            "detection_event_forwarded_orchestrator",
                            detection_id=str(detection_id),
                            plate=record.plate_number,
                            status=resp.status_code,
                        )
                    else:
                        logger.warning(
                            "orchestrator_ingest_unexpected_status",
                            status=resp.status_code,
                            plate=record.plate_number,
                        )
            except asyncio.CancelledError:
                raise
            except Exception as http_err:
                logger.warning(
                    "http_fallback_to_orchestrator_failed",
                    error=str(http_err)[:200],
                    plate=record.plate_number,
                )

    async def refresh_watchlist(self) -> int:
        """Force-refresh the watchlist cache. Returns new cache size."""
        self._watchlist_last_refresh = 0
        await self._refresh_watchlist_cache()
        return len(self._watchlist_cache)
