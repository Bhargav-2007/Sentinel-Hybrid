# Changelog — Gujarat Sentinel Hybrid Platform

All notable changes to the Sentinel-Hybrid codebase are documented in this file.

## [v2.4.0-PROD] — 2026-09-03

### Core Real-Data & Integrity Overhaul

#### Added
- Full native SQLite connection resiliency in `backend-orchestrator` (`create_db_engine()`) supporting local database operations alongside Dockerized PostgreSQL 16.
- Comprehensive `scripts/scan-no-mock-data.py` automated audit script with `--ci` gate checking for 13 distinct mock patterns.
- `docs/PRODUCTION_TRUTH_MATRIX.md` detailing exact stack implementations and database schema bindings.
- `docs/audits/REPOSITORY_CONSISTENCY_AUDIT.md` verifying 100% production mock elimination.

#### Changed
- `ai-detection/app/ocr/plate_reader.py`: Upgraded to PyTorch CPU + EasyOCR CRAFT text detection. Returns clean empty results and 0.0 confidence when unreadable rather than injecting synthetic plates.
- `frontend/src/core/api/trackingApi.ts`: Direct binding to `/api/v1/orchestrator/vehicle/:plate` without hardcoded 4-point fallback trajectory.
- `frontend/src/core/api/alertsApi.ts`: Removed default fallback strings (`GJ01AB1234`, `FIR-2026-CR-0881`, velocity 68.2 km/h).
- `frontend/src/core/api/camerasApi.ts`: Real coordinate mapping and `CONNECTING` default status rather than forced `ONLINE` and synthetic math.
- `frontend/src/core/api/casesApi.ts`: Direct backend query to `/api/v1/cases` without fake fallback case.
- `frontend/src/core/api/systemApi.ts`: Real health orchestration telemetry via `/api/v1/orchestrator/system-health`.
- `frontend/src/stores/targetStore.ts`: Empty default target initialization without pre-seeded suspect and sightings.
- `frontend/src/features/cases/CasesPage.tsx`: Real Section 65B case builder; displays verified sightings or empty state with clear toast feedback instead of generating random corridor checkpoints.
- `frontend/src/features/live-operations/LiveOperationsPage.tsx`: Removed arbitrary suspect flagging on cameras 1 & 4.
- `frontend/src/features/system-status/SystemStatusPage.tsx`: Dynamic metric calculations from live service status.
- `frontend/src/features/cameras/CameraManagementPage.tsx`: Dynamic department counts derived directly from camera registry.
- `frontend/src/features/gis/StatewideMapPage.tsx`: Real department metadata filtering instead of modulo arithmetic.

#### Removed
- Deleted `scripts/server/sentinel_live_engine.py` (1576-line fake server).
- Removed `_mock_detect_vehicles` in `backend-model2/app/pipeline/anpr_engine.py`.
- Removed fake fallback vehicle insertions in `ai-detection/app/detectors/person_vehicle.py` and `license_plate.py`.
- Removed hardcoded stream annotations in `backend-orchestrator/app/api/v1/streams.py`.
- Removed auto-seeding mock cases in `backend-orchestrator/app/services/case_service.py`.
