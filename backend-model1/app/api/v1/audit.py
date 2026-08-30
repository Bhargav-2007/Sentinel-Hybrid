"""
Gujarat Sentinel — Model 1
Audit Trail API Router (v1)
"""

from __future__ import annotations

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditEntry, AuditActionEnum
from app.db.session import get_session
from app.schemas.camera import AuditEntrySchema, AuditTrailResponseSchema

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditTrailResponseSchema)
async def list_audit_trail(
    entity_type: str | None = Query(None),
    entity_id: uuid.UUID | None = Query(None),
    action: str | None = Query(None),
    actor_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_session),
) -> AuditTrailResponseSchema:
    """
    Query the audit trail with optional filters.

    The audit trail records all create/update/delete operations on cameras
    and departments. Used for compliance, forensic investigation, and SIEM integration.
    """
    query = select(AuditEntry).order_by(AuditEntry.timestamp.desc())

    if entity_type:
        query = query.where(AuditEntry.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditEntry.entity_id == entity_id)
    if action:
        query = query.where(AuditEntry.action == action)
    if actor_id:
        query = query.where(AuditEntry.actor_id == actor_id)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar_one()

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    entries = result.scalars().all()

    return AuditTrailResponseSchema(
        items=[
            AuditEntrySchema(
                id=e.id,
                entity_type=e.entity_type,
                entity_id=e.entity_id,
                action=e.action,
                actor_id=e.actor_id,
                actor_ip=e.actor_ip,
                diff=e.diff or {},
                context=e.context or {},
                timestamp=e.timestamp,
            )
            for e in entries
        ],
        total=total,
        page=page,
        page_size=page_size,
    )
