# Changelog — Gujarat Sentinel Hybrid Platform

All notable changes to the Sentinel-Hybrid codebase are documented in this file.

## [v2.5.0-PROD] — 2026-09-04

### Production Streaming Gateway, Forensic Audit & Multi-Hypothesis Analytics

#### Added
- **Live MediaMTX Streaming Integration**: Secure authenticated reverse proxy for WebRTC WHEP (`POST /api/v1/streams/{cam}/whep`) and live RTSP frame snapshots with monotonic Presentation Time Stamp (`X-Sentinel-PTS-MS`) headers extracted directly from video hardware clocks (`cv2.CAP_PROP_POS_MSEC`).
- **Empirical Stream Verification**: Probed all 30 live Gujarat CCTV streams (`cam01`–`cam30`) on `103.250.160.189`, confirming 30/30 active streaming paths.
- **Dedicated Forensic Audit Ledger UI** (`frontend/src/features/audit/AuditLedgerPage.tsx`): Real-time view of immutable audit entries with SHA-256 HMAC digital signatures, action filtering, badge search, and Section 65B integrity validation.
- **Dedicated AI Vision Analytics UI** (`frontend/src/features/analytics/AnalyticsPage.tsx`): Real-time telemetry displaying detection throughput, unique plate counts, active feeds, GPU acceleration status, and camera allocations by district and department.
- **Bayesian Cross-Camera Correlation & Shortest Path Routing**: Exposed `/api/v1/orchestrator/correlate` and `/api/v1/orchestrator/route-reconstruction` implementing multi-signal vehicle association and Dijkstra route reconstruction across the Gujarat camera network graph.
- **Automated Section 65B Alert Dispatch**: Added `POST /api/v1/alerts/auto-dispatch` route with automatic PCR interception orders and immutable audit trail logging.
- **Secure Case Dossier Deletion**: Added `DELETE /api/v1/cases/{case_id}` with GitHub-style typed confirmation and Section 65B audit trail logging.
- **Comprehensive Documentation Suite**: Added `FRONTEND_BACKEND_DATA_TRACEABILITY.md`, `LIVE_CCTV_PIPELINE_VERIFICATION.md`, `BROWSER_APPLICATION_AUDIT.md`, `UI_UX_VERIFICATION.md`, `LIVE_CCTV_RUNBOOK.md`, and `OPERATIONS_AND_USAGE_GUIDE.md`.

#### Changed
- **Cases Page Honesty Overhaul**: Initialized `sightings` state to `[]` (removed all hardcoded fake sightings, fake speeds, and fake coordinates). Updated verified node badge to calculate dynamically: `{new Set(sightings.map(s => s.camera_id || s.camera_name).filter(Boolean)).size} Node(s) Verified`. Added explicit empty state row when no sightings are logged.
- **Relative Export URLs**: Converted `casesApi` export report URLs to relative paths (`/api/v1/cases/${caseId}/export/...`) eliminating hardcoded `localhost:8000` references.
- **Truthful Telemetry Fallbacks**: Replaced mock fallback numbers in `model2_client.get_anpr_statistics()` with truthful zero / OFFLINE states when the AI service is disconnected.
- **Department Allocation Fix**: Removed modulo arithmetic (`camNum % 5`) in `LiveOperationsPage.tsx`; departments are now strictly derived from the SQL camera registry.
- **Router Configuration**: Updated `router.tsx` to mount `<AnalyticsPage />` and `<AuditLedgerPage />` under `/analytics` and `/audit` instead of redirecting to `/system-status`.

#### Verified
- **Anti-Mock Scanner**: 0 production violations across 263 source files (`python scripts/scan-no-mock-data.py --ci`).
- **Sentinel Evaluator**: 100/100 Mandatory Compliance (M-001–M-008), 100/100 Bonus Readiness (B-001–B-006), 100/100 Security & Section 65B Integrity, 100/100 Performance & Latency.
- **Test Suites**: 14/14 backend-orchestrator tests passed; 22/22 ai-detection tests passed; frontend TypeScript & Vite build 100% successful.

---

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
