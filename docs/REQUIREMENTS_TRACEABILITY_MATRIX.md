# Gujarat Sentinel — Requirements Traceability Matrix (RTM)

This document provides a comprehensive mapping from every requirement specified for the **Gujarat Police Innovation Challenge 2026** to its exact code implementation, API endpoints, testing artifacts, and live demonstration proof.

---

## 1. End-to-End Core Pipeline Traceability

| Requirement | Implementation File(s) | Endpoint / Component | Demonstration Proof / Test | Status |
|---|---|---|---|---|
| **1. Camera Ingestion** | `ai-detection/app/utils/video.py`<br>`backend-orchestrator/app/services/camera_service.py` | `POST /api/v1/cameras/onboard-50`<br>`GET /api/v1/cameras/{id}/health` | `python scripts/demo/hackathon_scenario.py`<br>30 live RTSP streams on `live.corp8.cloud` | **IMPLEMENTED** |
| **2. Vehicle & Person Detection** | `ai-detection/app/detectors/person_vehicle.py` | `POST /detect/person-vehicle`<br>`POST /detect/full` | `python scripts/benchmarks/benchmark_ai_pipeline.py`<br>YOLO11n + ByteTrack | **IMPLEMENTED** |
| **3. High-Security ANPR (HSRP)** | `ai-detection/app/ocr/plate_reader.py`<br>`ai-detection/app/ocr/temporal_fusion.py` | `POST /detect/anpr`<br>`POST /detect/full` | `pytest ai-detection/tests/test_anpr_difficult_conditions.py`<br>PaddleOCR / EasyOCR + HSRP | **IMPLEMENTED** |
| **4. Watchlist Matching** | `backend-orchestrator/app/services/watchlist_service.py`<br>`backend-orchestrator/app/adapters/external_apis_abstraction.py` | `GET /api/v1/watchlists/check/{plate}`<br>`POST /api/v1/watchlists` | `python scripts/demo/hackathon_scenario.py`<br>eGujCop/VAHAN crime match | **IMPLEMENTED** |
| **5. Threat Scoring & APB Alerts** | `backend-orchestrator/app/services/confidence_engine.py`<br>`backend-orchestrator/app/services/alert_service.py` | `GET /api/v1/alerts`<br>`POST /api/v1/alerts` | `pytest backend-orchestrator/tests/`<br>0–100 Threat Score + Triage Tiers | **IMPLEMENTED** |
| **6. PostGIS GIS Dashboard** | `backend-orchestrator/app/services/camera_service.py`<br>`frontend/src/components/map/GujaratGISMap.tsx` | `GET /api/v1/cameras/geojson`<br>`GET /api/v1/cameras/nearby` | `CommandDashboard.tsx`<br>Leaflet GIS animated route lines | **IMPLEMENTED** |
| **7. Cross-Camera Tracking & Corridor Speed** | `backend-orchestrator/app/services/cross_camera_correlator.py`<br>`backend-orchestrator/app/services/tracking_service.py` | `GET /api/v1/tracking/{plate}`<br>`GET /api/v1/tracking/corridor-speed/calculate` | `InvestigatePage.tsx`<br>Haversine + PTS speed calculation | **IMPLEMENTED** |
| **8. Forensic Evidence & Section 65B** | `backend-orchestrator/app/services/evidence_service.py`<br>`backend-orchestrator/app/api/v1/evidence.py` | `POST /api/v1/evidence/generate/{id}`<br>`POST /api/v1/evidence/verify`<br>`GET /api/v1/evidence/chain-of-custody/{id}` | `InvestigatePage.tsx`<br>`Section65BModal.tsx`<br>SHA-256 HMAC integrity check | **IMPLEMENTED** |

---

## 2. Deep-Dive Feature Traceability Matrix

### AI, OCR & Difficult Conditions
| Feature | Implementation | Proof | Status |
|---|---|---|---|
| **Multi-Frame OCR Temporal Voting** | `ai-detection/app/ocr/temporal_fusion.py` | `pytest ai-detection/tests/test_anpr_difficult_conditions.py` | **IMPLEMENTED** |
| **Indian Plate Format Validation** | `ai-detection/app/ocr/plate_reader.py` (Standard, BH Series, Diplomatic) | Tested in unit tests with regex & positional substitution | **IMPLEMENTED** |
| **OCR Confidence Scoring** | `ai-detection/app/ocr/plate_reader.py` | Character-level & aggregate confidence scores | **IMPLEMENTED** |
| **Difficult Condition Testing (Night, Rain, Blur, Angle, Dirty)** | `ai-detection/tests/test_anpr_difficult_conditions.py` | CLAHE + Bilateral filtering synthetic tests | **IMPLEMENTED** |
| **AI Performance Benchmarks** | `scripts/benchmarks/benchmark_ai_pipeline.py` | Outputs `reports/AI_PERFORMANCE_BENCHMARKS.md` | **IMPLEMENTED** |

### Intelligence & Suspicious Activity
| Feature | Implementation | Proof | Status |
|---|---|---|---|
| **Threat Scores 0–100** | `backend-orchestrator/app/services/confidence_engine.py` | Calibrated probabilistic multi-signal engine | **IMPLEMENTED** |
| **Severity Triage (Low, Med, High, Crit)** | `backend-orchestrator/app/services/confidence_engine.py` | Color-coded badges in Command Dashboard | **IMPLEMENTED** |
| **False-Positive Reduction** | `backend-orchestrator/app/services/confidence_engine.py` | Suppresses single-frame low-confidence misreads | **IMPLEMENTED** |
| **Wrong-Way Driving Detection** | `ai-detection/app/detectors/anomalies.py` | Heading angle vector contradiction test | **IMPLEMENTED** |
| **Stopped Vehicle Detection** | `ai-detection/app/detectors/anomalies.py` | Stationary track duration > 15s in corridor | **IMPLEMENTED** |
| **Restricted Zone Intrusion** | `ai-detection/app/detectors/anomalies.py` | Ray-casting point-in-polygon algorithm | **IMPLEMENTED** |
| **Loitering Detection** | `ai-detection/app/detectors/anomalies.py` | Pedestrian dwell time > 25s within radius | **IMPLEMENTED** |
| **Crowd Surge Anomaly** | `ai-detection/app/detectors/anomalies.py` | Pedestrian density clustering check | **IMPLEMENTED** |
| **Abandoned Object Detection** | `ai-detection/app/detectors/anomalies.py` | Unattended backpack/suitcase duration check | **IMPLEMENTED** |

### Cross-Camera & Search Intelligence
| Feature | Implementation | Proof | Status |
|---|---|---|---|
| **Cross-Camera Vehicle Correlation** | `backend-orchestrator/app/services/cross_camera_correlator.py` | Plate + Class + Color + Travel-time correlation | **IMPLEMENTED** |
| **Cloned Plate Anomaly Detection** | `backend-orchestrator/app/services/cross_camera_correlator.py` | Impossible simultaneous sightings / speed > 160 km/h | **IMPLEMENTED** |
| **Person Appearance Re-ID** | `ai-detection/app/detectors/attributes.py`<br>`cross_camera_correlator.py` | Upper/lower clothing color HSV segmentation | **IMPLEMENTED** |
| **360° Unified Search** | `frontend/src/features/investigate/InvestigatePage.tsx` | Plate, Color, Person attributes, District, Date filters | **IMPLEMENTED** |

### Evidence & Camera Health
| Feature | Implementation | Proof | Status |
|---|---|---|---|
| **Evidence Package Generation** | `backend-orchestrator/app/services/evidence_service.py` | Automatic JSON / PDF / Section 65B bundle | **IMPLEMENTED** |
| **SHA-256 HMAC Integrity & Tamper Verification** | `backend-orchestrator/app/api/v1/evidence.py` | `POST /api/v1/evidence/verify` endpoint & UI | **IMPLEMENTED** |
| **Immutable Chain of Custody Ledger** | `backend-orchestrator/app/services/evidence_service.py` | Logs who created, viewed, exported evidence | **IMPLEMENTED** |
| **Camera Health & Diagnostics** | `backend-orchestrator/app/services/camera_service.py` | Offline, frozen stream, black screen, FPS, latency | **IMPLEMENTED** |
| **Multi-VMS Integration Layer** | `backend-orchestrator/app/adapters/vms_abstraction.py` | Hikvision ISAPI, Dahua CGI, ONVIF, RTSP adapters | **IMPLEMENTED** |
| **External API Transparency** | `backend-orchestrator/app/adapters/external_apis_abstraction.py` | Explicitly labels simulated databases (VAHAN, eGujCop) | **IMPLEMENTED** |

### Security, Scalability & Resilience
| Feature | Implementation | Proof | Status |
|---|---|---|---|
| **Secret Scanning & Sanitization** | `scripts/security/scan_secrets.py`<br>`.gitignore` | Automated static scanner with zero leaks | **IMPLEMENTED** |
| **Security & Vulnerability Audit** | `scripts/security/security_audit.py` | Dockerfile, JWT auth, and API policy checks | **IMPLEMENTED** |
| **API Rate Limiting & Brute Force Defense** | `backend-orchestrator/app/core/rate_limiter.py` | Sliding window middleware on API endpoints | **IMPLEMENTED** |
| **Service-to-Service Authentication** | `backend-orchestrator/app/core/service_auth.py` | Inter-service mesh header verification | **IMPLEMENTED** |
| **Multi-Camera Scalability Tests (10, 25, 50, 100)** | `scripts/benchmarks/benchmark_scalability.py` | Generates `reports/CAMERA_SCALABILITY_REPORT.md` | **IMPLEMENTED** |
| **Failure Resilience & Fault Recovery** | `scripts/demo/test_failure_resilience.py` | Kafka outage, DB reconnect, DLQ, Idempotency | **IMPLEMENTED** |
| **GitHub Actions Automated CI/CD** | `.github/workflows/ci.yml` | Quality, security, unit test, build pipeline | **IMPLEMENTED** |

### Command Center UI & Demo Mode
| Feature | Implementation | Proof | Status |
|---|---|---|---|
| **1-Click Live Demo Mode** | `frontend/src/features/dashboard/CommandDashboard.tsx` | 4 Predefined scenarios (Stolen, Route, Anomaly, Evidence) | **IMPLEMENTED** |
| **Dedicated Live Alert Panel** | `frontend/src/features/alerts/AlertsPage.tsx` | Severity filter, triage actions, FIR links | **IMPLEMENTED** |
| **Dedicated Investigation Dossier** | `frontend/src/features/investigate/InvestigatePage.tsx` | 360° vehicle/person profile, route history | **IMPLEMENTED** |
| **Dedicated Camera Management** | `frontend/src/features/cameras/CameraManagementPage.tsx` | 50-camera grid, stream URL onboarding | **IMPLEMENTED** |

---

## 3. Honest Architectural Scope Classification

- **IMPLEMENTED (Live & Verified):**
  * Real RTSP video ingestion from Gujarat camera cluster (`live.corp8.cloud:8554`).
  * Computer Vision ANPR (YOLO + PaddleOCR/EasyOCR + Multi-Frame Temporal Fusion).
  * 0–100 Threat Scoring Engine & Alert Prioritization.
  * Cross-Camera Highway Route Correlation & Implied Velocity Estimation.
  * Section 65B Evidence Packaging with SHA-256 HMAC Verification.
  * Full-Stack React Command Room & Leaflet PostGIS Mapping.
  * Automated Security Scanning, Rate Limiting, and Failure Resilience.

- **PROTOTYPE / CONNECTOR ABSTRACTION (Simulated Sandboxes):**
  * Government Databases (VAHAN 4.0, eGujCop CCTNS, SARTHI, AFIS, NAFIS) — Implemented as standardized simulation adapters ready for NIC production IP whitelisting.
  * Multi-Vendor VMS Hardware (Hikvision ISAPI / Dahua DSS / ONVIF) — Implemented as extensible driver SDKs tested against mock simulators and live RTSP.

- **PLANNED (Future State Enhancements):**
  * Statewide drone fleet auto-dispatch integration.
  * Edge NPU deployment on embedded Jetson/Ambarella camera chips.
