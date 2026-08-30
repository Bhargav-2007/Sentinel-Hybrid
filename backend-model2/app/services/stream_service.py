"""
Gujarat Sentinel — Model 2
Stream Service — business logic for stream management
"""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StreamState, StreamStatusEnum
from app.db.session import get_session
from app.schemas.schemas import (
    StreamCatalogueResponseSchema,
    StreamConnectResponseSchema,
    StreamDetailSchema,
    StreamLocationSchema,
)

logger = structlog.get_logger(__name__)

# Module-level reference to the global stream manager (set at startup)
_stream_manager = None


def set_stream_manager(manager: Any) -> None:
    global _stream_manager
    _stream_manager = manager


class StreamService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_streams(
        self,
        status_filter: str | None = None,
        department_id: str | None = None,
    ) -> StreamCatalogueResponseSchema:
        query = select(StreamState)
        if status_filter:
            query = query.where(StreamState.status == status_filter)
        if department_id:
            query = query.where(StreamState.department == department_id)

        result = await self.db.execute(query.order_by(StreamState.stream_id))
        streams = result.scalars().all()

        active_count = sum(1 for s in streams if s.status == StreamStatusEnum.live)

        return StreamCatalogueResponseSchema(
            streams=[self._to_schema(s) for s in streams],
            total=len(streams),
            active_count=active_count,
        )

    async def get_stream(self, stream_id: str) -> StreamDetailSchema:
        from fastapi import HTTPException
        result = await self.db.execute(
            select(StreamState).where(StreamState.stream_id == stream_id)
        )
        stream = result.scalar_one_or_none()
        if not stream:
            raise HTTPException(status_code=404, detail=f"Stream {stream_id} not found")
        return self._to_schema(stream)

    async def connect_stream(self, stream_id: str) -> StreamConnectResponseSchema:
        if _stream_manager is None:
            return StreamConnectResponseSchema(
                stream_id=stream_id,
                status=StreamStatusEnum.error,
                analytics_pipeline=False,
                message="Stream manager not initialized",
            )

        success = await _stream_manager.connect_stream(stream_id)
        return StreamConnectResponseSchema(
            stream_id=stream_id,
            status=StreamStatusEnum.connecting if success else StreamStatusEnum.error,
            analytics_pipeline=success,
            message="RTSP consumer started" if success else "Failed to start consumer",
        )

    async def disconnect_stream(self, stream_id: str) -> None:
        if _stream_manager:
            await _stream_manager.disconnect_stream(stream_id)

    async def connect_all(self, max_streams: int = 10) -> int:
        if _stream_manager is None:
            return 0
        return await _stream_manager.connect_all(max_streams=max_streams)

    async def sync_catalogue(self) -> int:
        if _stream_manager is None:
            return 0
        return await _stream_manager.sync_stream_catalogue()

    async def get_ingest_catalogue(self) -> list[dict[str, Any]]:
        """Return Sentinel-compatible /api/ingest format."""
        result = await self.db.execute(select(StreamState))
        streams = result.scalars().all()

        catalogue = []
        for s in streams:
            catalogue.append({
                "id": s.stream_id,
                "camera_id": s.camera_id,
                "name": s.name,
                "rtsp_url": s.rtsp_url,
                "hls_url": s.hls_url or "",
                "webrtc_url": s.webrtc_url or "",
                "codec": s.codec,
                "resolution": s.resolution,
                "frame_rate": s.frame_rate,
                "bitrate_kbps": s.bitrate_kbps,
                "live": s.status == StreamStatusEnum.live,
                "location": {
                    "latitude": s.latitude,
                    "longitude": s.longitude,
                    "district": s.district,
                },
            })
        return catalogue

    def _to_schema(self, s: StreamState) -> StreamDetailSchema:
        return StreamDetailSchema(
            id=s.stream_id,
            camera_id=s.camera_id,
            name=s.name,
            status=s.status,
            rtsp_url=s.rtsp_url,
            hls_url=s.hls_url,
            webrtc_url=s.webrtc_url,
            codec=s.codec,
            resolution=s.resolution,
            frame_rate=s.frame_rate,
            bitrate_kbps=s.bitrate_kbps,
            location=StreamLocationSchema(
                latitude=s.latitude,
                longitude=s.longitude,
                district=s.district,
            ) if s.latitude else None,
            analytics_active=s.analytics_active,
            last_frame_at=s.last_frame_at,
            department=s.department,
            reconnect_count=s.reconnect_count,
            error_message=s.error_message,
        )


async def get_stream_service(db: AsyncSession = Depends(get_session)) -> StreamService:
    return StreamService(db)
