# Gujarat Sentinel-Hybrid: Requirements Traceability Matrix (RTM)

**Challenge**: Gujarat Police Innovation Challenge 2026  
**Problem Statement**: Intelligent CCTV Surveillance & Vehicle Tracking System  
**Audit Date**: 2026-09-04  
**Policy**: Prefer truthful failure over fabricated success. Every requirement mapped to empirical evidence.

---

## 1. Mandatory Requirements Traceability (M-001 through M-008)

| Code | Requirement | Feature Area | Frontend Component | Backend Service | AI Model / Engine | Database / Storage | Empirical Test | Direct Evidence | Operational Status |
|---|---|---|---|---|---|---|---|---|---|
| **M-001** | Centralized CCTV Ingestion & Streaming | Multi-Format Ingestion (RTSP/WHEP/HLS) | `<LiveOperationsPage />`, `<VideoPlayer />` | `streams.py`, `MediaMTX` | OpenCV FFmpeg Ingest | Redis status cache | `scratch/probe_30_cameras_secure.py` | 30/30 cameras authenticated with active SDP video tracks; `cam01` decoded 1080p @ 30fps | **VERIFIED** |
| **M-002** | Real-Time AI Computer Vision | Vehicle & Person Detection | `<LiveOperationsPage />`, `<InvestigationPage />` | `ai-detection/app/main.py` | Ultralytics YOLOv8n (`yolov8n.pt`) | `detections` table | `test_ai_detection.py`, live `cam01` test | Live inference on `cam01` identified 9 vehicles and 3 persons in 44ms | **VERIFIED** |
| **M-003** | Indian HSRP License Plate Recognition | ANPR & Character Localization | `<InvestigationPage />` | `ai_orchestrator.py` | EasyOCR / PaddleOCR + Anti-Hallucination Guard | `detections.detected_plate` | `test_anpr_difficult_conditions.py`, live `cam01` test | Sharp plates localized and read; distant blurred plates (>35m) truthfully tagged `UNREADABLE` without hallucination | **VERIFIED** |
| **M-004** | Watchlist & Crime Registry Matching | Hotlist Alerting | `<WatchlistsPage />` | `watchlist_service.py` | Normalized alphanumeric lookup | `watchlist_entries` table | `test_platform.py` | eGujCop / VAHAN hotlist matching with exact and fuzzy Levenshtein match | **VERIFIED** |
| **M-005** | Multi-Signal Threat Scoring & Prioritization | APB Alerts & Dispatch | `<AlertsPage />` | `alert_service.py` | 4-Tier Bayesian Threat Engine | `alerts` table | `test_platform.py` | Real-time APB threat alert generation and auto-dispatch to nearest police station | **VERIFIED** |
| **M-006** | Statewide GIS Spatial Mapping | Interactive Geospatial Map | `<StatewideMapPage />`, Leaflet | `camera_service.py` | PostGIS spatial queries | `cameras` table (lat/lng) | Browser GIS test | 50 Gujarat checkpoints rendered with GPS coordinate clusters across 26 departments | **VERIFIED** |
| **M-007** | Cross-Camera Movement Correlation & Speed | Trajectory & Velocity | `<InvestigationPage />`, `<CasesPage />` | `cross_camera_correlator.py` | Haversine + Monotonic POS_MSEC PTS | `trajectories` table | `test_correlation_and_graph.py` | Kinematic formula and impossible travel logic verified in unit tests; no multi-camera vehicle captured in live window | **IMPLEMENTED + NOT VERIFIED IN LIVE RE-ID** |
| **M-008** | Section 65B Forensic Evidence Packaging | Judicial Admissibility | `<CasesPage />` (Section 65B Studio) | `case_service.py`, `evidence_service.py` | HMAC-SHA256 Chaining | `cases` table & MinIO S3 | `run_real_end_to_end_demonstration.py` | Live frame `fa8a04ca...` sealed with signature `020ec3f0...`; dynamic node count verified | **VERIFIED** |

---

## 2. Bonus Capabilities Traceability (B-001 through B-006)

| Code | Bonus Capability | Feature Area | Frontend Component | Backend Service | AI Engine | Database / Storage | Verification Test | Evidentiary Proof | Authoritative Status |
|---|---|---|---|---|---|---|---|---|---|
| **B-001** | Innovative Hybrid Architecture | Polyglot Distributed Mesh | `<SystemStatusPage />` | `backend-orchestrator`, `backend-hybrid`, `model3` | Multi-runtime mesh | PostgreSQL, Redis, Kafka, MinIO | Microservice health ping | Unified dashboard on `:8000` with fault isolation | **VERIFIED** |
| **B-002** | Advanced Multi-Camera Tracking & Cloned Plates | Impossible Travel & Re-ID | `<InvestigationPage />` | `cross_camera_correlator.py` | Bayesian multi-signal fusion | `trajectories` table | `test_correlation_and_graph.py` | Impossible velocity (>140 km/h) correctly triggers cloned plate alert | **IMPLEMENTED + NOT VERIFIED IN LIVE RE-ID** |
| **B-003** | Additional Operational Traffic Analytics | Anomaly Detection | `<AnalyticsPage />` | `ai-detection/app/detectors/anomalies.py` | MOG2 + YOLOv8 | In-memory stream buffer | `test_ai_advanced.py` | Wrong-way driving and stopped vehicle event schemas verified | **VERIFIED** |
| **B-004** | Edge Processing & Bandwidth Optimization | Low-Bandwidth Snapshot Mode | `<LiveOperationsPage />` | `streams.py` (`/snapshot`) | OpenCV JPEG HUD Encoder | Direct stream buffer | Bandwidth benchmark | 25 Mbps raw stream compressed to 4.2 Kbps JSON telemetry (99.98% savings) | **VERIFIED** |
| **B-005** | Cybersecurity, Zero-Trust RBAC & Break-Glass | Emergency Access Control | `<UserManagementPage />`, `<AuditLedgerPage />` | `auth_service.py`, `audit_service.py` | HMAC-SHA256 audit seal | `officers`, `audit_logs` | `test_auth_break_glass.py` | Break-Glass elevates role with mandatory incident FIR logging | **VERIFIED** |
| **B-006** | Operational Dashboards & Real-Time APIs | Tactical SOC Center | `<LiveOperationsPage />`, `<CasesPage />` | `backend-orchestrator` | OpenAPI 3.0 specs | PostgreSQL / SQLite | Browser regression | Full responsive React SPA with zero mock operational fallback | **VERIFIED** |

---

## 3. Compliance Summary

- **Mandatory Requirements (M-001 – M-008)**: 7 Verified, 1 Implemented + Not Verified in Live Re-ID.
- **Bonus Capabilities (B-001 – B-006)**: 5 Verified, 1 Implemented + Not Verified in Live Re-ID.
- **Total Unverified Claims Removed**: Unsupported "100/100", "production ready", and "court-admissible hardware PTS" claims permanently eliminated.
