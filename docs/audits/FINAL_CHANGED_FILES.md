# Final Changed Files Inventory

**Audit Date**: 2026-09-04T15:23:15+05:30  
**Phase Identifier**: `PHASE_27`  
**Classification**: File Delta & Architecture Audit  

---

## 1. Summary of Changes

During the Final Production Hardening & Live Verification Phase, code, configuration, test suites, and documentation were systematically inspected, sanitized, and hardened.

---

## 2. Inventory by Subsystem

### A. Security & Configuration
- `[MODIFY]` `.gitignore`: Added recursive `.env` ignore patterns (`**/.env`, `**/.env.*`, `!**/.env.example`) to prevent accidental commits of nested credentials.
- `[MODIFY]` `.env.example`: Updated stream gateway host to `103.250.160.189`, added sanitized placeholders for `SENTINEL_STREAM_USER` and `SENTINEL_STREAM_PASSWORD`.
- `[MODIFY]` `docs/PRODUCTION_TRUTH_MATRIX.md`: Purged exposed plaintext stream password; replaced with `[REDACTED_RUNTIME_CREDENTIAL]`.

### B. Backend Orchestrator (`backend-orchestrator`)
- `[MODIFY]` `app/services/camera_service.py`: Changed newly onboarded camera default status from `CameraStatus.ONLINE` to `CameraStatus.OFFLINE` with `is_live=False` until confirmed by real socket probe.
- `[MODIFY]` `app/api/v1/streams.py`: Linked camera resolution to database registry; added diagnostic socket probe; extracted monotonic `cv2.CAP_PROP_POS_MSEC` PTS; eliminated silent exception swallowing.
- `[MODIFY]` `app/core/database.py`: Added socket TCP reachability check for PostgreSQL with seamless fallback to `sentinel_platform.db` (SQLite) in development; added schema migrations for `officers.jurisdiction` and `custom_permissions`.
- `[MODIFY]` `app/services/case_service.py`: Eliminated hardcoded `68.2 km/h` fallback speed and fake PTS generator; implemented dynamic `Detection` table lookups for target plates.

### C. AI Detection Microservice (`ai-detection`)
- `[MODIFY]` `app/main.py`: Added missing `import os` import.
- `[MODIFY]` `app/utils/video.py`: Eliminated fallback synthetic vehicle generator; dynamically injects runtime stream credentials into OpenCV capture options; masks credentials in log messages.

### D. Frontend Surveillance Dashboard (`frontend`)
- `[MODIFY]` `src/features/cases/CasesPage.tsx`: Dynamically compute verified node count via `new Set(sightings.map(s => s.camera_id)).size`; eliminated hardcoded `4 Node(s) Verified` badge; removed fallback `45.0 km/h` speed and arbitrary PTS loop.
- `[MODIFY]` `src/features/live-operations/LiveOperationsPage.tsx`: Removed modulo-based department assignment; bound filtering strictly to authoritative `c.department_id`.
- `[MODIFY]` `src/app/router.tsx`: Routed dedicated `/analytics` and `/audit` pages; verified RBAC role guards.

### E. Audits & Engineering Documentation (`docs/audits/` & `docs/architecture/`)
- `[NEW]` `docs/audits/PHASE_00_BASELINE.md`
- `[NEW]` `docs/audits/PHASE_01_SECURITY_AUDIT.md`
- `[NEW]` `docs/audits/PHASE_02_ARCHITECTURE_AUDIT.md`
- `[NEW]` `docs/architecture/ACTUAL_RUNTIME_ARCHITECTURE.md`
- `[NEW]` `docs/architecture/ACTUAL_SERVICE_CATALOGUE.md`
- `[NEW]` `docs/audits/PHASE_03_CAMERA_GATEWAY_VERIFICATION.md`
- `[MODIFY]` `docs/audits/CAMERA_BY_CAMERA_VERIFICATION.md`
- `[NEW]` `docs/audits/PHASE_04_CAMERA_REGISTRY_AUDIT.md`
- `[NEW]` `docs/architecture/CAMERA_DATA_OWNERSHIP.md`
- `[NEW]` `docs/audits/PHASE_05_MEDIA_PIPELINE_VERIFICATION.md`
- `[NEW]` `docs/architecture/MEDIA_PLANE.md`
- `[NEW]` `docs/audits/PHASE_06_PTS_FORENSIC_AUDIT.md`
- `[NEW]` `docs/audits/TIMESTAMP_PTS_FORENSIC_AUDIT.md`
- `[NEW]` `docs/architecture/TIME_AND_TIMESTAMP_MODEL.md`
- `[NEW]` `docs/audits/PHASE_07_AI_RUNTIME_AUDIT.md`
- `[NEW]` `docs/audits/AI_RUNTIME_ARCHITECTURE.md`
- `[NEW]` `docs/audits/PHASE_08_SINGLE_CAMERA_AI_PROOF.md`
- `[NEW]` `docs/audits/PHASE_09_EVENT_AND_PERSISTENCE_PROOF.md`
- `[NEW]` `docs/audits/PHASE_10_INVESTIGATION_SEARCH_PROOF.md`
- `[NEW]` `docs/audits/PHASE_11_CASE_MANAGEMENT_PROOF.md`
- `[NEW]` `docs/audits/PHASE_12_VERIFIED_NODE_AUDIT.md`
- `[NEW]` `docs/audits/PHASE_13_CROSS_CAMERA_CORRELATION_PROOF.md`
- `[NEW]` `docs/audits/PHASE_14_30_CAMERA_AI_VALIDATION.md`
- `[NEW]` `docs/audits/PHASE_15_PERFORMANCE_REPORT.md`
- `[NEW]` `docs/audits/PHASE_16_FAILURE_RECOVERY_REPORT.md`
- `[NEW]` `docs/audits/PHASE_17_FRONTEND_DATA_INTEGRATION.md`
- `[NEW]` `docs/audits/PHASE_18_BROWSER_FUNCTIONAL_VERIFICATION.md`
- `[NEW]` `docs/audits/PHASE_19_OFFICER_UX_AUDIT.md`
- `[NEW]` `docs/innovation/BONUS_CAPABILITY_MATRIX.md`
- `[MODIFY]` `docs/requirements/REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `[NEW]` `docs/audits/PHASE_22_DOCUMENTATION_CONSISTENCY.md`
- `[NEW]` `docs/audits/PHASE_23_REPOSITORY_TRUTH_AUDIT.md`
- `[NEW]` `docs/audits/PHASE_24_FINAL_SECURITY_AUDIT.md`
- `[NEW]` `docs/audits/PHASE_25_DEPLOYMENT_VERIFICATION.md`
- `[NEW]` `docs/audits/PHASE_26_FINAL_BROWSER_REGRESSION.md`
- `[NEW]` `docs/audits/FINAL_PRODUCTION_HARDENING_REPORT.md`
- `[NEW]` `docs/REQUIREMENTS_STATUS.md`
- `[NEW]` `docs/FINAL_SERVICE_INVENTORY.md`
- `[NEW]` `docs/audits/PHASE_BLOCKER_REGISTER.md`
- `[NEW]` `docs/architecture/PHASE_DEPENDENCY_GRAPH.md`
- `[NEW]` `docs/audits/PHASE_EXCEPTION_REGISTER.md`
- `[MODIFY]` `PRODUCTION_READINESS.md`
