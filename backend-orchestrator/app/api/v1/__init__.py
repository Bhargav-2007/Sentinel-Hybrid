"""API v1 master router aggregator."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.cameras import router as cameras_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.orchestrator import router as orchestrator_router
from app.api.v1.tracking import router as tracking_router
from app.api.v1.watchlists import router as watchlists_router
from app.api.v1.departments import router as departments_router
from app.api.v1.cost_benefit import router as cost_benefit_router
from app.api.v1.audit import router as audit_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.cases import router as cases_router
from app.api.v1.websockets import router as ws_router
from app.api.v1.streams import router as streams_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(cameras_router)
api_router.include_router(alerts_router)
api_router.include_router(orchestrator_router)
api_router.include_router(tracking_router)
api_router.include_router(cases_router)
api_router.include_router(watchlists_router)
api_router.include_router(departments_router)
api_router.include_router(cost_benefit_router)
api_router.include_router(audit_router)
api_router.include_router(evidence_router)
api_router.include_router(ws_router)
api_router.include_router(streams_router)

