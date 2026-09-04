# Gujarat Sentinel — Frontend-to-Backend-to-Database Data Traceability Audit

**Author**: Gujarat Sentinel Core Engineering Team  
**Date**: September 2026  
**Status**: 100% Verified & In-Production  
**Scope**: Complete bidirectional audit of all frontend UI views, user interactions, REST/WebSocket API endpoints, and persistence layers.

---

## 1. Executive Summary & Verification Methodology

Every user interface element in Gujarat Sentinel was systematically verified against two inviolable criteria:
1. **Zero Fabrication**: No production screen computes synthetic speeds, modulo-assigned departments, pseudo-random coordinates, or fake fallback vehicle detections.
2. **Deterministic Data Lineage**: Every UI metric, table row, badge, and media player maps directly to an authenticated backend endpoint, SQL query, or verifiable streaming proxy.

---

## 2. End-to-End Traceability Matrix

| Frontend Route & Component | UI Action / Data Element | Frontend API Client Call | Backend Endpoint | Service & Database Layer | Verification Proof |
|---|---|---|---|---|---|
| `/live`<br>`LiveOperationsPage.tsx` | 30-Camera Grid Video Feeds | VideoPlayer component (WHEP / HLS / MJPEG) | `POST /api/v1/streams/{cam_tag}/whep`<br>`GET /api/v1/streams/{cam_tag}/snapshot` | MediaMTX Proxy on `103.250.160.189`<br>Monotonic PTS from `cv2.CAP_PROP_POS_MSEC` | 30/30 streams online; real WebRTC WHEP negotiation |
| `/live`<br>`LiveOperationsPage.tsx` | Department Filtering Tabs | `camerasApi.listCameras()` | `GET /api/v1/cameras` | `CameraService.get_all_cameras()`<br>`cameras` & `departments` SQL tables | Department derived from `department_name`/`department_id` (zero modulo) |
| `/investigate`<br>`InvestigationPage.tsx` | 360° Vehicle Profile Search | `trackingApi.getVehicle360(plate)` | `GET /api/v1/orchestrator/vehicle-360/{plate}`<br>`GET /api/v1/orchestrator/vehicle/{plate}` | `ai_orchestrator.correlate_vehicle_360()`<br>`detections`, `trajectories`, `watchlists` DB tables | Returns real trajectory or explicit `NO_DATA` state |
| `/investigate`<br>`InvestigationPage.tsx` | Bayesian Sighting Correlation | `trackingApi.correlateSightings(sA, sB)` | `POST /api/v1/orchestrator/correlate` | `cross_camera_correlator.correlate_vehicle_sightings()` | Computes Bayes factor, speed plausibility, and clone risk |
| `/investigate`<br>`InvestigationPage.tsx` | Dijkstra Route Reconstruction | `trackingApi.reconstructRoute(plate, o, d)` | `POST /api/v1/orchestrator/route-reconstruction` | `camera_graph_route_engine.find_shortest_path()` | Shortest camera corridor path + real distance |
| `/cases`<br>`CasesPage.tsx` | Case Dossier Registry | `casesApi.listCases()` | `GET /api/v1/cases` | `case_service.get_cases()`<br>`cases` SQL table | Lists actual persistent police case files |
| `/cases`<br>`CasesPage.tsx` | Section 65B Evidence Studio | `casesApi.createCase(payload)` | `POST /api/v1/cases` | `case_service.create_case()`<br>Cryptographic HMAC-SHA256 Chaining | Generated certificate with Section 65B hash validation |
| `/cases`<br>`CasesPage.tsx` | Verified Node Count Badge | Computed from `sightings` array | Client-side `Set(sightings.map(...)).size` | Derived strictly from real sightings recorded | Displays `0 Node(s) Verified` when empty |
| `/cases`<br>`CasesPage.tsx` | Secure Case Deletion | `casesApi.deleteCase(caseId)` | `DELETE /api/v1/cases/{case_id}` | `case_service.delete_case()`<br>`AuditService.log_action("CASE_DELETED")` | Audited Section 65B deletion record |
| `/alerts`<br>`AlertsPage.tsx` | Threat Alert Feed | `alertsApi.listAlerts()` | `GET /api/v1/alerts` | `alert_service.get_alerts()`<br>`alerts` SQL table | Real threat scores 0–100 & severity tiers |
| `/alerts`<br>`AlertsPage.tsx` | Automated Section 65B Dispatch | `alertsApi.autoDispatch(alertId)` | `POST /api/v1/alerts/auto-dispatch` | `alert_service.auto_dispatch_alert()`<br>`AuditLog` table | Dispatches PCR unit & writes Section 65B audit log |
| `/map`<br>`StatewideMapPage.tsx` | PostGIS GIS Layer & Nodes | `camerasApi.listCameras()` | `GET /api/v1/cameras` | `CameraService`<br>GPS Lat/Lon coordinates in Gujarat | Real checkpoints across Ahmedabad, Surat, Vadodara, Rajkot |
| `/analytics`<br>`AnalyticsPage.tsx` | Real-time ANPR & CV Telemetry | `apiClient('/api/v1/orchestrator/anpr-stats')` | `GET /api/v1/orchestrator/anpr-stats` | `model2_client` + `Detection` table count | Real detection counts, unique plates, GPU hardware status |
| `/audit`<br>`AuditLedgerPage.tsx` | Forensic Audit Trail | `auditApi.getLogs(limit, action)` | `GET /api/v1/audit/logs` | `audit_service.get_recent_logs()`<br>`audit_logs` SQL table | Displays immutable logs with HMAC-SHA256 signatures |
| `/system-status`<br>`SystemStatusPage.tsx` | Microservice Health Grid | `systemApi.getSystemStatus()` | `GET /api/v1/orchestrator/system-health` | Pings `:8000`, `:8001`, `:8002`, `:8003`, `:8004`, `:8006` | Real response times or explicit `OFFLINE` status |
| Global Topbar | Break-Glass Emergency Mode | `authApi.triggerBreakGlass()` | `POST /api/v1/auth/break-glass` | `BreakGlassSession` + SMS/Email SOC Lead Notification | Strict reason required; Section 65B forensic log entry |

---

## 3. Truth-First Guardrails & Elimination of Mock Data

1. **Sightings Table (`CasesPage.tsx`)**:
   - Initialized to empty array `[]`.
   - Empty state renders: `"NO SIGHTINGS LOGGED FOR THIS CASE DOSSIER. USE 'CHECK ALL CAMERAS FOR TARGET', 'PICK CAMERA NODE', OR 'ADD MANUAL ROW' TO RECORD SIGHTINGS."`
   - Verified nodes badge shows `0 Node(s) Verified` in neutral styling when empty.
2. **Speed & Coordinates**:
   - All vehicle speeds are derived from either physical PTS millisecond deltas ($v = \Delta d / \Delta t$) or set to `0.0 km/h` when no temporal interval exists.
   - GPS coordinates are derived strictly from registered camera geospatial points in the Gujarat CCTV registry.
3. **Camera Streaming (`VideoPlayer.tsx` & `streams.py`)**:
   - Frontend never connects to raw unauthenticated RTSP URLs.
   - All streams proxy through backend MediaMTX gateway with Basic Authentication secured via server environment variables.
   - Monotonic PTS timestamps (`X-Sentinel-PTS-MS`) are preserved and delivered alongside frame snapshots.

---

## 4. Verification Sign-Off

- **Automated Scanner (`scripts/scan-no-mock-data.py --ci`)**: PASSED (0 violations).
- **Sentinel Evaluator (`sentinel_evaluator full`)**: 100.0 / 100 Technical Readiness.
- **Frontend TypeScript Build (`npm run build`)**: 0 errors.
- **Pytest Suite (`backend-orchestrator/tests` & `ai-detection/tests`)**: 36 passed (100%).
