# Phase 00: Production Baseline & Feature Freeze Audit

**Audit Date**: 2026-09-04T14:35:00+05:30  
**Phase Identifier**: `PHASE_00`  
**Phase Status**: `PASS`  
**Auditor**: Principal Software Architect & Verification Engineer  
**Objective**: Establish an immutable, authoritative baseline before executing the production hardening phase. Feature development is completely frozen.

---

## 1. Git Repository State

| Property | Value | Notes |
|---|---|---|
| **Branch** | `main` | Authoritative development branch |
| **Commit Target** | `c3a9cebf1798fb0f7a0acccc6405932eb426c9dc` | Target commit under verification |
| **Commit Message** | `Merge branch 'main' of https://github.com/Bhargav-2007/Sentinel-Hybrid` | Verified upstream sync |
| **Remote Origin** | `https://github.com/Bhargav-2007/Sentinel-Hybrid` | Public submission repository |

### Working Tree Status (`git status --short`)

```text
 M .env.example
 M .gitignore
 M docs/PRODUCTION_TRUTH_MATRIX.md
?? implementation_plan.md
```

### Git Diff Statistics (`git diff --stat`)

```text
 .env.example                    | 6 ++++--
 .gitignore                      | 5 +++++
 docs/PRODUCTION_TRUTH_MATRIX.md | 2 +-
 3 files changed, 10 insertions(+), 3 deletions(-)
```

---

## 2. Repository Architecture & Directory Inventory

The Sentinel-Hybrid repository is structured into distinct, decoupled subsystems:

```text
Sentinel-Hybrid/
├── backend-orchestrator/   # Primary Python FastAPI central brain & REST orchestration (:8000)
├── ai-detection/           # YOLOv8n + ByteTrack + EasyOCR computer vision service (:8006)
├── backend-model1/         # Python FastAPI Camera Registry & GIS microservice (:8001)
├── backend-model2/         # Python FastAPI ANPR stream processing worker (:8002)
├── backend-model3/         # Java 21 Spring Boot VMS federation gateway (:8003)
├── backend-model4/         # Go 1.23 Evidence Vault & Trajectory Router (:8004)
├── backend-hybrid/         # Go 1.23 High-throughput event routing engine
├── frontend/               # React 18, Vite, TypeScript, TailwindCSS operator dashboard (:5173)
├── contracts/              # Shared data contracts and OpenAPI specs
├── infra/                  # Docker Compose, Prometheus, Grafana, Traefik orchestration
├── sentinel_evaluator/     # Automated platform evaluation harness
├── simulators/             # RTSP and external mock API simulators
└── docs/                   # Engineering architecture, runbooks, and audit logs
```

---

## 3. Service Inventory

| Service Name | Technology / Runtime | Port | Purpose | Status in Baseline |
|---|---|---|---|---|
| **backend-orchestrator** | Python 3.10+ / FastAPI / SQLAlchemy | `:8000` | Central API brain, camera registry, cases, Section 65B signatures | **ACTIVE** |
| **ai-detection** | Python 3.10+ / PyTorch / YOLOv8 / EasyOCR | `:8006` | Live frame AI detection, vehicle/person inference, OCR | **ACTIVE** |
| **backend-model1** | Python 3.10+ / FastAPI / PostGIS | `:8001` | Spatial Camera Registry & GIS indexing | **ACTIVE** |
| **backend-model2** | Python 3.10+ / FastAPI / OpenCV | `:8002` | Stream consumer & batch ANPR worker | **ACTIVE** |
| **backend-model3** | Java 21 / Spring Boot 3 | `:8003` | Legacy VMS protocol federation & ONVIF gateway | **ACTIVE** |
| **backend-model4** | Go 1.23 / Gorilla Mux / MinIO | `:8004` | Evidence vault & corridor tracking | **ACTIVE** |
| **frontend** | React 18 / TypeScript / Vite / Tailwind | `:5173` | Police officer surveillance UI & case management | **ACTIVE** |
| **Media Gateway** | MediaMTX (External Live Gateway) | `103.250.160.189:8554` (RTSP)<br>`103.250.160.189:8889` (WHEP) | 30 Live CCTV streams (`cam01`–`cam30`) | **EXTERNAL LIVE** |

---

## 4. Frontend Route Inventory

All routes defined in `frontend/src/app/router.tsx`:

| Route Path | Element / Component | RBAC Permission Required | Operational Purpose |
|---|---|---|---|
| `/login` | `<LoginPage />` | Public | Officer authentication via Badge ID |
| `/` -> `/live` | `<LiveOperationsPage />` | Authenticated | 30-camera wall, interactive playback, WHEP/HLS |
| `/investigate` | `<InvestigationPage />` | `VIEW_INVESTIGATION_DOSSIER` | 360° Vehicle Dossier, ANPR search, sightings |
| `/map` | `<StatewideMapPage />` | Authenticated | GIS spatial map with clustered camera nodes |
| `/alerts` | `<AlertsPage />` | Authenticated | Real-time APB threat alerts & dispatch queue |
| `/cases` | `<CasesPage />` | `CREATE_CASE` | Investigation cases, Section 65B certificates |
| `/cameras` | `<CameraManagementPage />` | Authenticated | Authoritative camera inventory & health check |
| `/watchlists` | `<WatchlistsPage />` | `MANAGE_WATCHLISTS` | Stolen vehicles, suspect plates, hotlists |
| `/audit` | `<AuditLedgerPage />` | `VIEW_AUDIT_LOGS` | Section 65B immutable audit trail |
| `/analytics` | `<AnalyticsPage />` | Authenticated | Throughput, detection volume, ANPR accuracy |
| `/system-status`| `<SystemStatusPage />` | Authenticated | Microservice health matrix & broker status |
| `/users` | `<UserManagementPage />` | `MANAGE_USERS` | Officer accounts, badges, role assignment |
| `/settings` | `<SettingsPage />` | Authenticated | Stream thresholds, alert dispatch config |
| `/help` | `<HelpDocsPage />` | Authenticated | Operational SOPs and help documentation |

---

## 5. API Route Inventory (`backend-orchestrator`)

Prefix: `/api/v1`

| Tag / Area | Method & Route | Function / Description |
|---|---|---|
| **Auth** | `POST /auth/token`, `GET /auth/me`, `POST /auth/break-glass` | JWT token issuance, officer verification |
| **Cameras** | `GET /cameras`, `GET /cameras/{id}`, `POST /cameras` | Authoritative camera catalog & GIS coordinates |
| **Streams** | `GET /streams/{id}/status`, `GET /streams/{id}/whep` | WHEP proxy, real socket ping, live snapshot |
| **Alerts** | `GET /alerts`, `POST /alerts`, `POST /alerts/auto-dispatch` | Real-time APB alerts, emergency dispatch |
| **Cases** | `GET /cases`, `POST /cases`, `GET /cases/{id}/export-65b` | Case dossiers, dynamic node count, Section 65B |
| **Tracking**| `POST /tracking/corridor`, `GET /tracking/history/{plate}` | Dijkstra camera graph corridor reconstruction |
| **Orchestrator** | `GET /orchestrator/vehicle-360/{plate}`, `POST /orchestrator/correlate` | Cross-camera sighting correlation & dossier |
| **Audit** | `GET /audit/ledger`, `POST /audit/log` | Cryptographic SHA-256 event audit logging |
| **Evidence**| `GET /evidence/{id}`, `POST /evidence/sign` | Evidence package retrieval and verification |
| **Health** | `GET /orchestrator/system-health`, `GET /health` | Health matrix across all 6 services |

---

## 6. Database & Persistence Inventory

| Engine | Database Name | Configuration Source | Operational Role |
|---|---|---|---|
| **PostgreSQL + PostGIS** | `sentinel` | Port `:5432` | Production persistent datastore for cameras, officers, detections, cases |
| **SQLite (Fallback)** | `sentinel_platform.db` | Local filesystem | Dev / testing fallback when PostgreSQL is unreachable |
| **Redis** | `db 0` | Port `:6379` | Stream status caching, rate limiting, pub/sub alerting |
| **Apache Kafka** | Cluster | Port `:9092` | Asynchronous event streaming (`sentinel.detection.events`) |
| **OpenSearch** | Single-node | Port `:9200` | Full-text and geospatial search across vehicle sightings |
| **MinIO** | S3-compatible | Port `:9000` | Object storage for high-resolution snapshots & evidence |

---

## 7. Camera & Gateway Inventory

- **Live Gateway Address**: `103.250.160.189`
- **RTSP Protocol**: Port `8554/TCP`
- **WHEP Protocol**: Port `8889/TCP`
- **WebRTC UDP/ICE**: Port `8189/UDP`
- **Fleet Scope**: 30 dedicated CCTV feeds (`cam01` to `cam30`)
- **Gateway Software**: MediaMTX (v1.9.0+)
- **Authentication**: HTTP/RTSP Basic Authentication required for all media operations.

---

## 8. AI Runtime Inventory

- **Model Framework**: Ultralytics YOLOv8 (`yolov8n.pt`, 6.5 MB)
- **Tracker**: ByteTrack (Kalman filter + Hungarian association)
- **ANPR Engine**: EasyOCR / PaddleOCR neural engine
- **Device Support**: CUDA / DirectML / CPU fallback
- **Target Classes**: `car`, `truck`, `bus`, `motorcycle`, `person`

---

## 9. Known Pre-Hardening Blockers & Deficiencies

1. **Credentials Exposure Risk**: Raw stream credentials previously appeared in documentation (`docs/PRODUCTION_TRUTH_MATRIX.md`). Fixed immediately under Emergency Security Exception.
2. **H.265 WebRTC Limitation**: 6 cameras (`cam06`, `cam12`, `cam17`, `cam18`, `cam22`, `cam26`) stream in H.265 (HEVC), which native WebRTC browsers (Chrome/Firefox) do not support without transcoding.
3. **ANPR Optical Reality**: Distant vehicles (>30m) produce blurred plate crops. Previous systems hallucinated text; current pipeline correctly identifies plates as `UNREADABLE`.
4. **Compute Bounds**: Processing all 30 streams simultaneously at 25 FPS with YOLOv8 exceeds single-GPU desktop hardware; multi-camera orchestration must be carefully profiled.

---

## 10. Phase 00 Acceptance Evaluation

- [x] Current branch and commit hash recorded.
- [x] Working tree diff stat and status captured.
- [x] Complete inventory of services, routes, APIs, databases, and AI models established.
- [x] Feature freeze declared.

**Verdict: PASS**
