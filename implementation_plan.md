# Final Production Hardening & Live-System Verification Plan

## Executive Summary

This implementation plan governs the **Final Production Hardening & Live-System Verification** phase for the **Sentinel-Hybrid** CCTV surveillance platform.
In strict accordance with the user mandate:
- **Zero new features** or architectural scope creep.
- **Truthful failure over fabricated success**: All claims must be backed by empirical runtime measurements and verifiable logs.
- **Strict Phase Gating**: Every phase from Phase 00 to Phase 27 must be executed in order, produce its required concrete documentation artifacts, and be marked with its contractual status (`PASS`, `PASS_WITH_EXCEPTION`, `PARTIAL`, `BLOCKED`, `FAILED`, `STALE`, `SKIPPED`).
- **Secret Hygiene**: Stream and system credentials must never be committed or written into audit reports; they must only be loaded dynamically from runtime environment variables.

---

## User Review Required

> [!IMPORTANT]
> **Stream Credentials Injection**: Live camera stream credentials (`SENTINEL_STREAM_USER` and `SENTINEL_STREAM_PASSWORD`) are loaded strictly at runtime. The raw password in `docs/PRODUCTION_TRUTH_MATRIX.md` has been redacted, and `.gitignore` updated to prevent tracking of any `.env` files across the tree.
>
> **Authoritative Baseline**: The verification will document actual measured capacity (e.g., MediaMTX RTSP socket reachability for 30 cameras, single-camera live decode & inference for `cam01`, and truthful optical unreadable status for distant plates) rather than claiming 30/30 simultaneous GPU inference when single-node compute is bounded.

---

## Master Phase Execution Hierarchy

### Phase 00: Baseline / Feature Freeze
- Establish immutable baseline of git branch (`main`), commit (`c3a9cebf1798fb0f7a0acccc6405932eb426c9dc`), working tree status, service inventory, frontend routes, and active configuration.
- **Output**: `docs/audits/PHASE_00_BASELINE.md`

### Phase 01: Security & Secret Hygiene
- Scan repository, source files, `.env` files, and documentation for credentials/secrets.
- Verify `.gitignore` rules, verify that frontend bundles contain no credentials, and verify logs redact secrets.
- **Output**: `docs/audits/PHASE_01_SECURITY_AUDIT.md`

### Phase 02: Repository & Architecture Audit
- Audit all subsystems: `backend-orchestrator`, `ai-detection`, `model1`–`model4`, databases, Kafka, Redis, OpenSearch, MinIO, Docker, frontend.
- Classify each component: `ACTIVE`, `BROKEN`, `PARTIAL`, `DUPLICATE`, `UNUSED`, `TEST ONLY`.
- **Outputs**: `docs/audits/PHASE_02_ARCHITECTURE_AUDIT.md`, `docs/architecture/ACTUAL_RUNTIME_ARCHITECTURE.md`, `docs/architecture/ACTUAL_SERVICE_CATALOGUE.md`

### Phase 03: Live CCTV Gateway & Media Verification
- Verify reachability, Basic Auth, RTSP session establishment, and media descriptors for `cam01` through `cam30` on gateway `103.250.160.189`.
- **Outputs**: `docs/audits/PHASE_03_CAMERA_GATEWAY_VERIFICATION.md`, `docs/audits/CAMERA_BY_CAMERA_VERIFICATION.md`

### Phase 04: Authoritative Camera Registry
- Verify that camera catalogue originates from authoritative database registry / configuration.
- Remove any remaining synthetic camera generation loops and hardcoded runtime attributes (`ONLINE`, `25 FPS`, `1920x1080`).
- **Outputs**: `docs/audits/PHASE_04_CAMERA_REGISTRY_AUDIT.md`, `docs/architecture/CAMERA_DATA_OWNERSHIP.md`

### Phase 05: Live Media Pipeline (RTSP, WHEP, HLS)
- Verify end-to-end media delivery: RTSP TCP session (DESCRIBE, SETUP, PLAY), WHEP SDP offer/answer, and HLS manifest availability.
- Document H.264 vs H.265 (HEVC) browser playback constraints and server-side transcoding requirements.
- **Outputs**: `docs/audits/PHASE_05_MEDIA_PIPELINE_VERIFICATION.md`, `docs/architecture/MEDIA_PLANE.md`

### Phase 06: Frame & PTS / Timestamp Forensic Validation
- Forensic audit of timestamps: RTP timestamp -> decoder presentation timestamp (`cv2.CAP_PROP_POS_MSEC`) -> normalized timestamp -> event timestamp.
- Honestly label timing semantics without unsupported "hardware PTS" or "court-admissible" claims.
- **Outputs**: `docs/audits/PHASE_06_PTS_FORENSIC_AUDIT.md`, `docs/audits/TIMESTAMP_PTS_FORENSIC_AUDIT.md`, `docs/architecture/TIME_AND_TIMESTAMP_MODEL.md`

### Phase 07: AI Runtime Architecture Audit
- Identify and establish the authoritative live AI pipeline (`ai-detection` vs `backend-orchestrator`), preventing duplicate inference conflicts.
- **Outputs**: `docs/audits/PHASE_07_AI_RUNTIME_AUDIT.md`, `docs/audits/AI_RUNTIME_ARCHITECTURE.md`

### Phase 08: Single-Camera Real AI Proof (cam01)
- End-to-end empirical demonstration on `cam01`: Real frame -> YOLOv8 vehicle/person detection -> ByteTrack tracking -> plate detection & OCR (or unreadable status) -> event generation.
- **Output**: `docs/audits/PHASE_08_SINGLE_CAMERA_AI_PROOF.md`

### Phase 09: Event Pipeline & Persistence
- Trace real event ID persistence across event bus/Kafka -> PostgreSQL / SQLite -> OpenSearch -> MinIO evidence vault.
- **Output**: `docs/audits/PHASE_09_EVENT_AND_PERSISTENCE_PROOF.md`

### Phase 10: Investigation Search & Sighting Proof
- Verify searchability of persisted real event via vehicle search, plate query, and chronological sighting log.
- **Output**: `docs/audits/PHASE_10_INVESTIGATION_SEARCH_PROOF.md`

### Phase 11: Case Management & Dossier Population
- Verify case creation backed by real sightings, camera metadata, and Section 65B HMAC-SHA256 evidence integrity.
- **Output**: `docs/audits/PHASE_11_CASE_MANAGEMENT_PROOF.md`

### Phase 12: Verified Node Count Audit
- Audit verified node count calculation: `COUNT(DISTINCT camera_id)` from actual sightings, eliminating hardcoded constants.
- **Output**: `docs/audits/PHASE_12_VERIFIED_NODE_AUDIT.md`

### Phase 13: Cross-Camera Correlation Proof
- Evaluate multi-camera tracking capabilities. Mark `VERIFIED` only if qualifying multi-camera live observations exist, otherwise truthfully mark `IMPLEMENTED / NOT VERIFIED DUE TO NO QUALIFYING LIVE OBSERVATION`.
- **Output**: `docs/audits/PHASE_13_CROSS_CAMERA_CORRELATION_PROOF.md`

### Phase 14: 30-Camera AI & Scalability Verification
- Assess multi-camera concurrent AI processing. Record actual sustained camera count and hardware bottlenecks.
- **Output**: `docs/audits/PHASE_14_30_CAMERA_AI_VALIDATION.md`

### Phase 15: Performance & Capacity Benchmarks
- Measure CPU, RAM, GPU VRAM, network throughput, decoder load, and event latency.
- **Output**: `docs/audits/PHASE_15_PERFORMANCE_REPORT.md`

### Phase 16: Failure & Recovery Testing
- Verify graceful degradation: camera disconnect, RTSP timeout, PostgreSQL fallback, database unavailable states.
- **Output**: `docs/audits/PHASE_16_FAILURE_RECOVERY_REPORT.md`

### Phase 17: Frontend Data Integration Audit
- Audit every UI page (Dashboard, Live Operations, Investigate, ANPR, Tracking, Cases, Health, Audit) ensuring 100% data traceability to real backend APIs.
- **Output**: `docs/audits/PHASE_17_FRONTEND_DATA_INTEGRATION.md`

### Phase 18: Browser Functional Verification
- Test all major interactive controls, buttons, forms, video players, and exports.
- **Output**: `docs/audits/PHASE_18_BROWSER_FUNCTIONAL_VERIFICATION.md`

### Phase 19: Officer UI/UX Audit
- Ensure layout, typography, contrast, loading states, empty states, and error handling are police-officer friendly.
- **Output**: `docs/audits/PHASE_19_OFFICER_UX_AUDIT.md`

### Phase 20: Bonus & Innovation Capability Matrix
- Evaluate and classify all bonus capabilities: `VERIFIED`, `PARTIAL`, `NOT VERIFIED`, or `PLANNED`.
- **Output**: `docs/innovation/BONUS_CAPABILITY_MATRIX.md`

### Phase 21: Requirements Traceability Matrix
- Update mandatory requirements M-001 through M-008 and bonus features against empirical evidence.
- **Output**: `docs/requirements/REQUIREMENTS_TRACEABILITY_MATRIX.md`

### Phase 22: Documentation Synchronization
- Synchronize `README.md`, `PRODUCTION_READINESS.md`, `CHANGELOG.md`, and technical guides with code reality.
- **Output**: `docs/audits/PHASE_22_DOCUMENTATION_CONSISTENCY.md`

### Phase 23: Repository Consistency & Mock Elimination Audit
- Repository-wide grep audit for mock/fake/dummy tokens to confirm no live operational path relies on mock data.
- **Output**: `docs/audits/PHASE_23_REPOSITORY_TRUTH_AUDIT.md`

### Phase 24: Final Security Audit
- Re-verify zero secrets in git, code, bundles, or logs; verify RBAC and input validation.
- **Output**: `docs/audits/PHASE_24_FINAL_SECURITY_AUDIT.md`

### Phase 25: Clean Build & Deployment Verification
- Execute clean test suite run, backend syntax/import checks, and frontend production build.
- **Output**: `docs/audits/PHASE_25_DEPLOYMENT_VERIFICATION.md`

### Phase 26: Final Live Browser Regression
- End-to-end browser walkthrough of primary officer workflow on deployed or local stack.
- **Output**: `docs/audits/PHASE_26_FINAL_BROWSER_REGRESSION.md`

### Phase 27: Final Production Truth Report & Governance Deliverables
- Compile the final truthful status scorecard, blocker register, exception register, changed files inventory, and operations manual.
- **Outputs**:
  - `docs/audits/FINAL_PRODUCTION_HARDENING_REPORT.md`
  - `docs/PRODUCTION_TRUTH_MATRIX.md`
  - `docs/REQUIREMENTS_STATUS.md`
  - `docs/audits/FINAL_CHANGED_FILES.md`
  - `docs/FINAL_SERVICE_INVENTORY.md`
  - `docs/OPERATIONS_AND_USAGE_GUIDE.md`
  - `docs/audits/PHASE_BLOCKER_REGISTER.md`
  - `docs/architecture/PHASE_DEPENDENCY_GRAPH.md`
  - `docs/audits/PHASE_EXCEPTION_REGISTER.md`

---

## Verification Plan

### Automated Tests
1. Backend Orchestrator test suite: `pytest backend-orchestrator/tests -v`
2. AI Detection test suite: `pytest ai-detection/tests -v`
3. Frontend build verification: `npm run build` inside `frontend/`
4. Security secret scanner across repository.
