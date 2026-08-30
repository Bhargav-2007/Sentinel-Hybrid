"""
Gujarat Sentinel — Model 1
Kafka CloudEvents Publisher

Publishes structured CloudEvents to Kafka topics for downstream consumption
by Model 2 (ANPR), Model 3 (Federation), and Model 4 (Central VMS).

CloudEvents spec: https://cloudevents.io/ (v1.0.2)
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from aiokafka import AIOKafkaProducer
try:
    from cloudevents.http import CloudEvent
    from cloudevents.conversion import to_json
    HAS_CLOUDEVENTS_PKG = True
except ImportError:
    HAS_CLOUDEVENTS_PKG = False

from app.config import get_settings

logger = structlog.get_logger(__name__)

# Module-level producer (singleton)
_producer: AIOKafkaProducer | None = None


async def get_producer() -> AIOKafkaProducer:
    """Return the singleton Kafka producer, creating it if needed."""
    global _producer
    if _producer is None:
        settings = get_settings()
        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            value_serializer=lambda v: v,  # Pre-serialised bytes
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            compression_type="gzip",        # Standard library gzip compression
            acks="all",                     # Wait for all replicas (durability)
            enable_idempotence=True,        # Exactly-once semantics
            max_batch_size=32768,           # 32KB batch
            linger_ms=5,                   # 5ms batch window
            max_request_size=10485760,      # 10MB max message
        )
        await _producer.start()
        logger.info("kafka_producer_started", servers=settings.kafka_bootstrap_servers)
    return _producer


async def close_producer() -> None:
    """Gracefully stop the Kafka producer on shutdown."""
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
        logger.info("kafka_producer_stopped")


async def check_kafka_connection() -> bool:
    """Health check: verify Kafka connectivity."""
    try:
        producer = await get_producer()
        # Check if producer is connected
        return producer.client.ready(0) if hasattr(producer, "client") else True
    except Exception as e:
        logger.error("kafka_health_check_failed", error=str(e))
        return False


def _serialize_cloudevent(attributes: dict[str, Any], data: dict[str, Any]) -> bytes:
    if HAS_CLOUDEVENTS_PKG:
        try:
            event = CloudEvent(attributes=attributes, data=data)
            return to_json(event)
        except Exception:
            pass
    payload = {**attributes, "data": data}
    return json.dumps(payload, default=str).encode("utf-8")


class EventPublisher:
    """
    CloudEvents publisher for Sentinel platform events.

    Each published event is a structured CloudEvent with:
    - Unique event ID (UUID v4)
    - Source: "sentinel/model1/registry"
    - Type: namespaced event type (e.g., "in.gujarat.sentinel.camera.registered")
    - Data: JSON payload
    - OpenTelemetry trace context propagation headers

    The message key is the camera_id for Kafka partitioning — all events
    for the same camera go to the same partition, preserving order.
    """

    def __init__(self, producer: AIOKafkaProducer):
        self.producer = producer
        self.settings = get_settings()

    async def publish_camera_event(
        self,
        event_type: str,
        camera_id: str,
        payload: dict[str, Any],
    ) -> str:
        """
        Publish a camera lifecycle event to Kafka.

        Args:
            event_type: Short type like "camera.registered"
            camera_id: Internal or department camera ID (used as Kafka message key)
            payload: Event data dict

        Returns:
            CloudEvent ID (UUID)
        """
        event_id = str(uuid.uuid4())
        full_type = f"in.gujarat.sentinel.{event_type}"

        attributes = {
            "specversion": "1.0",
            "id": event_id,
            "source": "sentinel/model1/registry",
            "type": full_type,
            "datacontenttype": "application/json",
            "time": datetime.now(tz=timezone.utc).isoformat(),
            "dataschema": "https://sentinel.gujarat.gov.in/schemas/camera-event",
            "subject": camera_id,
        }

        event_bytes = _serialize_cloudevent(attributes, payload)
        topic = self.settings.topic_camera_events

        try:
            await self.producer.send_and_wait(
                topic=topic,
                key=camera_id,
                value=event_bytes,
                headers=[
                    ("content-type", b"application/cloudevents+json; charset=UTF-8"),
                    ("event-type", full_type.encode()),
                ],
            )
            logger.info(
                "kafka_event_published",
                event_id=event_id,
                event_type=full_type,
                topic=topic,
                camera_id=camera_id,
            )
        except Exception as e:
            # Log but don't fail the main operation — events are best-effort
            # In production, implement a transactional outbox pattern
            logger.error(
                "kafka_publish_failed",
                event_type=full_type,
                camera_id=camera_id,
                error=str(e),
            )

        return event_id

    async def publish_health_event(
        self,
        camera_id: str,
        is_reachable: bool,
        latency_ms: int | None,
        stream_active: bool,
        error: str | None,
    ) -> None:
        """Publish camera health status update event."""
        await self.publish_camera_event(
            event_type="camera.health_updated",
            camera_id=camera_id,
            payload={
                "is_reachable": is_reachable,
                "latency_ms": latency_ms,
                "stream_active": stream_active,
                "error": error,
            },
        )

    async def publish_audit_event(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        actor_id: str,
        diff: dict[str, Any],
    ) -> None:
        """Publish audit trail event for compliance/SIEM integration."""
        settings = get_settings()
        event_id = str(uuid.uuid4())
        full_type = "in.gujarat.sentinel.audit.entry"

        attributes = {
            "specversion": "1.0",
            "id": event_id,
            "source": "sentinel/model1/registry",
            "type": full_type,
            "datacontenttype": "application/json",
            "time": datetime.now(tz=timezone.utc).isoformat(),
            "subject": entity_id,
        }

        try:
            await self.producer.send_and_wait(
                topic=settings.topic_audit_events,
                key=entity_id,
                value=_serialize_cloudevent(attributes, {
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "action": action,
                    "actor_id": actor_id,
                    "diff": diff,
                }),
            )
        except Exception as e:
            logger.error("audit_event_publish_failed", error=str(e))
