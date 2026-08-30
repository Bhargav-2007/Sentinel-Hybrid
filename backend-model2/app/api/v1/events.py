"""
Gujarat Sentinel — Model 2
Events API Router — OpenSearch-backed event search
"""

from __future__ import annotations

from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, Query

from app.config import get_settings
from app.schemas.schemas import EventListResponseSchema, EventSchema

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventListResponseSchema, summary="Search events (OpenSearch)")
async def search_events(
    q: str | None = Query(None, description="Full-text query"),
    event_type: str | None = Query(None),
    camera_id: str | None = Query(None),
    from_time: datetime | None = Query(None),
    to_time: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    """
    Search tagged events from OpenSearch.
    Events include vehicle detections, ANPR reads, watchlist hits, and anomalies.
    """
    settings = get_settings()

    try:
        from opensearchpy import AsyncOpenSearch
        client = AsyncOpenSearch(
            hosts=[settings.opensearch_url],
            use_ssl=False,
            verify_certs=False,
        )

        # Build OpenSearch query
        must_clauses = []
        if q:
            must_clauses.append({"multi_match": {
                "query": q,
                "fields": ["plate_number", "camera_id", "district", "vehicle_type"],
            }})
        if event_type:
            must_clauses.append({"term": {"event_type": event_type}})
        if camera_id:
            must_clauses.append({"term": {"camera_id": camera_id}})

        filter_clauses = []
        if from_time or to_time:
            range_q: dict = {}
            if from_time:
                range_q["gte"] = from_time.isoformat()
            if to_time:
                range_q["lte"] = to_time.isoformat()
            filter_clauses.append({"range": {"timestamp": range_q}})

        body = {
            "query": {
                "bool": {
                    "must": must_clauses or [{"match_all": {}}],
                    "filter": filter_clauses,
                }
            },
            "sort": [{"timestamp": {"order": "desc"}}],
            "from": (page - 1) * page_size,
            "size": page_size,
        }

        result = await client.search(
            index=settings.opensearch_index_events,
            body=body,
        )
        await client.close()

        hits = result.get("hits", {})
        total = hits.get("total", {}).get("value", 0)

        items = []
        for hit in hits.get("hits", []):
            source = hit["_source"]
            items.append(EventSchema(
                id=hit["_id"],
                event_type=source.get("event_type", "unknown"),
                camera_id=source.get("camera_id", ""),
                stream_id=source.get("stream_id"),
                timestamp=source.get("timestamp", datetime.now().isoformat()),
                data=source,
                tags=source.get("tags", []),
            ))

        return EventListResponseSchema(
            items=items, total=total, page=page, page_size=page_size,
        )

    except Exception as e:
        logger.warning("opensearch_query_failed", error=str(e)[:200])
        # Fallback: return empty results
        return EventListResponseSchema(
            items=[], total=0, page=page, page_size=page_size,
        )
