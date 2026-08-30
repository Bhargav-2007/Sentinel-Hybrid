"""
Gujarat Sentinel — Model 1
Camera Business Logic Service

Implements all CRUD, bulk import, and validation logic.
Publishes CloudEvents to Kafka after each mutation for downstream consumption.
"""

from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from geoalchemy2.functions import ST_AsGeoJSON, ST_MakePoint, ST_SetSRID
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import EventPublisher
from app.db.models import (
    AuditActionEnum,
    AuditEntry,
    Camera,
    CameraStatusEnum,
    Department,
)
from app.schemas.camera import (
    BulkImportErrorSchema,
    BulkImportResultSchema,
    CameraBulkImportSchema,
    CameraCreateSchema,
    CameraListParams,
    CameraListResponseSchema,
    CameraResponseSchema,
    CameraUpdateSchema,
    LocationSchema,
)

logger = structlog.get_logger(__name__)


class CameraService:
    """
    Camera registry business logic.

    Follows repository pattern — all DB interaction goes through this service.
    The service is responsible for:
      1. Data validation and transformation
      2. PostGIS geometry construction
      3. Audit trail creation
      4. Kafka event publishing
    """

    def __init__(self, db: AsyncSession, publisher: EventPublisher, actor_id: str, actor_ip: str | None = None):
        self.db = db
        self.publisher = publisher
        self.actor_id = actor_id
        self.actor_ip = actor_ip

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def create_camera(self, data: CameraCreateSchema) -> CameraResponseSchema:
        """Register a new camera with full audit trail and Kafka event."""

        # Check for duplicate camera_id
        existing = await self._find_by_camera_id(data.camera_id)
        if existing and existing.deleted_at is None:
            raise ValueError(f"Camera with camera_id '{data.camera_id}' already exists")

        # Build PostGIS Point geometry
        location_wkt = (
            f"SRID={4326};POINT({data.location.longitude} {data.location.latitude})"
        )

        camera = Camera(
            camera_id=data.camera_id,
            department_id=data.department_id,
            name=data.name,
            # PostGIS geometry
            location=location_wkt,
            latitude=data.location.latitude,
            longitude=data.location.longitude,
            altitude_meters=data.location.altitude_meters,
            address=data.location.address,
            district=data.location.district,
            taluka=data.location.taluka,
            pincode=data.location.pincode,
            # Technical specs
            camera_type=data.camera_type,
            protocol=data.protocol,
            codec=data.codec,
            resolution=data.resolution,
            frame_rate=data.frame_rate,
            rtsp_url=data.rtsp_url,
            onvif_url=data.onvif_url,
            vendor=data.vendor,
            model_number=data.model_number,
            install_date=data.install_date,
            amc_expiry_date=data.amc_expiry_date,
            storage_type=data.storage_type,
            retention_days=data.retention_days,
            is_public_domain=data.is_public_domain,
            tags=data.tags,
            extra_metadata=data.metadata,
            status=CameraStatusEnum.unknown,
            created_by=self.actor_id,
        )

        self.db.add(camera)
        await self.db.flush()  # Get the generated UUID

        # Write audit trail
        await self._write_audit(
            entity_type="camera",
            entity_id=camera.id,
            action=AuditActionEnum.create,
            diff={"before": None, "after": data.model_dump(mode="json")},
        )

        await self.db.commit()
        await self.db.refresh(camera)

        # Publish CloudEvent to Kafka
        await self.publisher.publish_camera_event(
            event_type="camera.registered",
            camera_id=str(camera.id),
            payload={"camera_id": camera.camera_id, "department_id": str(camera.department_id)},
        )

        logger.info(
            "camera_registered",
            camera_id=camera.camera_id,
            internal_id=str(camera.id),
            actor=self.actor_id,
        )

        return await self._to_response(camera)

    async def list_cameras(self, params: CameraListParams) -> CameraListResponseSchema:
        """Paginated camera list with filtering support."""

        query = select(Camera).where(Camera.deleted_at.is_(None))

        # Apply filters
        if params.department_id:
            query = query.where(Camera.department_id == params.department_id)
        if params.status:
            query = query.where(Camera.status == params.status)
        if params.camera_type:
            query = query.where(Camera.camera_type == params.camera_type)
        if params.district:
            query = query.where(Camera.district.ilike(f"%{params.district}%"))
        if params.search:
            search_term = f"%{params.search}%"
            query = query.where(
                Camera.camera_id.ilike(search_term)
                | Camera.name.ilike(search_term)
                | Camera.address.ilike(search_term)
            )
        if params.bbox_coords:
            min_lon, min_lat, max_lon, max_lat = params.bbox_coords
            # ST_Within uses PostGIS bounding box
            from geoalchemy2.functions import ST_MakeEnvelope, ST_Within
            envelope = ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
            query = query.where(ST_Within(Camera.location, envelope))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar_one()

        # Apply pagination and ordering
        query = (
            query.order_by(Camera.created_at.desc())
            .offset(params.offset)
            .limit(params.page_size)
        )

        result = await self.db.execute(query)
        cameras = result.scalars().all()

        return CameraListResponseSchema(
            items=[await self._to_response(cam) for cam in cameras],
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=(total + params.page_size - 1) // params.page_size,
        )

    async def get_camera(self, camera_id: uuid.UUID) -> CameraResponseSchema:
        """Get a single camera by internal UUID."""
        camera = await self._get_or_404(camera_id)
        return await self._to_response(camera)

    async def update_camera(
        self, camera_id: uuid.UUID, data: CameraUpdateSchema
    ) -> CameraResponseSchema:
        """Update camera metadata with audit trail."""

        camera = await self._get_or_404(camera_id)

        # Build before-state for audit diff
        before = {
            "name": camera.name,
            "status": camera.status,
            "district": camera.district,
        }

        # Apply updates
        update_fields = data.model_dump(exclude_none=True)
        for field, value in update_fields.items():
            if field == "location" and value is not None:
                loc = LocationSchema(**value) if isinstance(value, dict) else value
                camera.location = f"SRID=4326;POINT({loc.longitude} {loc.latitude})"
                camera.latitude = loc.latitude
                camera.longitude = loc.longitude
                camera.altitude_meters = loc.altitude_meters
                camera.address = loc.address
                camera.district = loc.district
                camera.taluka = loc.taluka
                camera.pincode = loc.pincode
            else:
                setattr(camera, field, value)

        # Status change gets its own audit action
        action = AuditActionEnum.status_change if data.status else AuditActionEnum.update
        after = {k: getattr(camera, k) for k in before}

        await self._write_audit(
            entity_type="camera",
            entity_id=camera.id,
            action=action,
            diff={"before": before, "after": after},
        )

        await self.db.commit()
        await self.db.refresh(camera)

        await self.publisher.publish_camera_event(
            event_type="camera.updated",
            camera_id=str(camera.id),
            payload=update_fields,
        )

        logger.info("camera_updated", camera_id=str(camera.id), actor=self.actor_id)
        return await self._to_response(camera)

    async def delete_camera(self, camera_id: uuid.UUID) -> None:
        """Soft delete a camera (sets deleted_at, preserves audit data)."""

        camera = await self._get_or_404(camera_id)
        camera.deleted_at = datetime.now(tz=timezone.utc)
        camera.status = CameraStatusEnum.decommissioned

        await self._write_audit(
            entity_type="camera",
            entity_id=camera.id,
            action=AuditActionEnum.delete,
            diff={"before": {"deleted_at": None}, "after": {"deleted_at": str(camera.deleted_at)}},
        )

        await self.db.commit()

        await self.publisher.publish_camera_event(
            event_type="camera.decommissioned",
            camera_id=str(camera.id),
            payload={"camera_id": camera.camera_id},
        )

        logger.info("camera_decommissioned", camera_id=str(camera.id), actor=self.actor_id)

    # ── Bulk Import ───────────────────────────────────────────────────────────

    async def bulk_import_cameras(
        self, data: CameraBulkImportSchema
    ) -> BulkImportResultSchema:
        """
        Import up to 10,000 cameras with per-row error handling.

        Design: validate all rows first (in memory), then batch-insert valid rows.
        This avoids partial commits on schema failures but allows partial success
        when individual rows have data issues.
        """

        succeeded = 0
        failed = 0
        skipped = 0
        errors: list[BulkImportErrorSchema] = []

        # Collect valid cameras for batch insert
        valid_cameras: list[Camera] = []

        for idx, camera_data in enumerate(data.cameras):
            row_num = idx + 1
            try:
                # Check for duplicate
                existing = await self._find_by_camera_id(camera_data.camera_id)
                if existing and existing.deleted_at is None:
                    if data.skip_duplicates:
                        skipped += 1
                        continue
                    else:
                        # Update existing camera metadata
                        update_schema = CameraUpdateSchema(**camera_data.model_dump(exclude={"camera_id", "department_id"}))
                        await self.update_camera(existing.id, update_schema)
                        succeeded += 1
                        continue

                location_wkt = (
                    f"SRID=4326;POINT({camera_data.location.longitude} {camera_data.location.latitude})"
                )
                valid_cameras.append(
                    Camera(
                        camera_id=camera_data.camera_id,
                        department_id=camera_data.department_id,
                        name=camera_data.name,
                        location=location_wkt,
                        latitude=camera_data.location.latitude,
                        longitude=camera_data.location.longitude,
                        altitude_meters=camera_data.location.altitude_meters,
                        address=camera_data.location.address,
                        district=camera_data.location.district,
                        taluka=camera_data.location.taluka,
                        pincode=camera_data.location.pincode,
                        camera_type=camera_data.camera_type,
                        protocol=camera_data.protocol,
                        codec=camera_data.codec,
                        resolution=camera_data.resolution,
                        frame_rate=camera_data.frame_rate,
                        rtsp_url=camera_data.rtsp_url,
                        onvif_url=camera_data.onvif_url,
                        vendor=camera_data.vendor,
                        model_number=camera_data.model_number,
                        install_date=camera_data.install_date,
                        amc_expiry_date=camera_data.amc_expiry_date,
                        storage_type=camera_data.storage_type,
                        retention_days=camera_data.retention_days,
                        is_public_domain=camera_data.is_public_domain,
                        tags=camera_data.tags,
                        extra_metadata=camera_data.metadata,
                        status=CameraStatusEnum.unknown,
                        created_by=self.actor_id,
                    )
                )
                succeeded += 1

            except Exception as e:
                failed += 1
                errors.append(
                    BulkImportErrorSchema(
                        row=row_num,
                        camera_id=camera_data.camera_id,
                        error=str(e),
                    )
                )
                logger.warning(
                    "bulk_import_row_error",
                    row=row_num,
                    camera_id=camera_data.camera_id,
                    error=str(e),
                )

        if not data.dry_run and valid_cameras:
            # Batch insert all valid cameras
            self.db.add_all(valid_cameras)
            await self.db.flush()

            # Single bulk audit entry
            await self._write_audit(
                entity_type="camera",
                entity_id=uuid.uuid4(),  # Synthetic ID for bulk operation
                action=AuditActionEnum.bulk_import,
                diff={
                    "count": len(valid_cameras),
                    "succeeded": succeeded,
                    "failed": failed,
                },
                context={"batch_id": str(uuid.uuid4())},
            )
            await self.db.commit()

            # Publish bulk event to Kafka
            await self.publisher.publish_camera_event(
                event_type="camera.bulk_imported",
                camera_id="bulk",
                payload={"count": len(valid_cameras), "actor": self.actor_id},
            )

        logger.info(
            "bulk_import_complete",
            total=len(data.cameras),
            succeeded=succeeded,
            failed=failed,
            skipped=skipped,
            dry_run=data.dry_run,
        )

        return BulkImportResultSchema(
            total=len(data.cameras),
            succeeded=succeeded,
            failed=failed,
            skipped=skipped,
            errors=errors,
        )

    async def bulk_import_from_csv(self, csv_content: str) -> BulkImportResultSchema:
        """Parse CSV content and delegate to bulk_import_cameras."""
        from app.schemas.camera import CameraCreateSchema

        reader = csv.DictReader(io.StringIO(csv_content))
        cameras = []
        parse_errors = []

        for idx, row in enumerate(reader):
            try:
                # Parse location from CSV columns
                location = LocationSchema(
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    address=row.get("address"),
                    district=row.get("district"),
                    taluka=row.get("taluka"),
                    pincode=row.get("pincode"),
                )
                camera = CameraCreateSchema(
                    camera_id=row["camera_id"],
                    name=row["name"],
                    department_id=uuid.UUID(row["department_id"]),
                    location=location,
                    camera_type=row.get("camera_type", "dome"),
                    protocol=row.get("protocol"),
                    codec=row.get("codec"),
                    resolution=row.get("resolution"),
                    frame_rate=int(row["frame_rate"]) if row.get("frame_rate") else None,
                    rtsp_url=row.get("rtsp_url"),
                    vendor=row.get("vendor"),
                    storage_type=row.get("storage_type"),
                    retention_days=int(row["retention_days"]) if row.get("retention_days") else None,
                    is_public_domain=row.get("is_public_domain", "true").lower() == "true",
                )
                cameras.append(camera)
            except Exception as e:
                parse_errors.append(
                    BulkImportErrorSchema(
                        row=idx + 2,  # +2 for header + 1-indexed
                        camera_id=row.get("camera_id", "unknown"),
                        error=f"CSV parse error: {e}",
                    )
                )

        if not cameras and parse_errors:
            return BulkImportResultSchema(
                total=len(parse_errors),
                succeeded=0,
                failed=len(parse_errors),
                skipped=0,
                errors=parse_errors,
            )

        result = await self.bulk_import_cameras(
            CameraBulkImportSchema(cameras=cameras)
        )
        result.errors = parse_errors + result.errors
        result.failed += len(parse_errors)
        return result

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_or_404(self, camera_id: uuid.UUID) -> Camera:
        """Fetch camera by internal UUID, raise 404 if not found or deleted."""
        from fastapi import HTTPException

        result = await self.db.execute(
            select(Camera).where(Camera.id == camera_id, Camera.deleted_at.is_(None))
        )
        camera = result.scalar_one_or_none()
        if camera is None:
            raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
        return camera

    async def _find_by_camera_id(self, camera_id: str) -> Camera | None:
        """Find camera by department-assigned ID."""
        result = await self.db.execute(
            select(Camera).where(Camera.camera_id == camera_id)
        )
        return result.scalar_one_or_none()

    async def _write_audit(
        self,
        entity_type: str,
        entity_id: uuid.UUID,
        action: AuditActionEnum,
        diff: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> None:
        """Write an audit trail entry."""
        entry = AuditEntry(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=self.actor_id,
            actor_ip=self.actor_ip,
            diff=diff,
            context=context or {},
        )
        self.db.add(entry)

    async def _to_response(self, camera: Camera) -> CameraResponseSchema:
        """Convert ORM Camera to response schema."""
        location = LocationSchema(
            latitude=camera.latitude,
            longitude=camera.longitude,
            altitude_meters=camera.altitude_meters,
            address=camera.address,
            district=camera.district,
            taluka=camera.taluka,
            pincode=camera.pincode,
        )
        return CameraResponseSchema(
            id=camera.id,
            camera_id=camera.camera_id,
            name=camera.name,
            department_id=camera.department_id,
            location=location,
            camera_type=camera.camera_type,
            protocol=camera.protocol,
            codec=camera.codec,
            resolution=camera.resolution,
            frame_rate=camera.frame_rate,
            vendor=camera.vendor,
            model_number=camera.model_number,
            install_date=camera.install_date,
            amc_expiry_date=camera.amc_expiry_date,
            storage_type=camera.storage_type,
            retention_days=camera.retention_days,
            is_public_domain=camera.is_public_domain,
            tags=camera.tags or [],
            metadata=camera.extra_metadata or {},
            status=camera.status,
            last_health_check_at=camera.last_health_check_at,
            created_at=camera.created_at,
            updated_at=camera.updated_at,
            created_by=camera.created_by,
            deleted_at=camera.deleted_at,
        )
