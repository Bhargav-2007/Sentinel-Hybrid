# Phase 04: Authoritative Camera Registry & Data Ownership Audit

**Audit Date**: 2026-09-04T14:39:40+05:30  
**Phase Identifier**: `PHASE_04`  
**Phase Status**: `PASS`  
**Auditor**: Principal Data Architect & Backend Lead  
**Objective**: Audit the camera catalogue data flow to ensure camera metadata originates strictly from the authoritative database registry and that live runtime status is never fabricated or hardcoded.

---

## 1. Executive Summary

A critical inspection was conducted across `backend-orchestrator`, `backend-model1`, and frontend feed ingestion:
- **Synthetic Loop Elimination**: Verified that no operational endpoints use `for i in range(1, 31)` to dynamically generate mock operational cameras. All camera records are registered entities with distinct IDs, codes, geographic coordinates, and department ownership.
- **Status Separation**: Resolved a critical vulnerability in `backend-orchestrator/app/services/camera_service.py` where newly onboarded cameras were erroneously initialized with `CameraStatus.ONLINE`. Fixed default state to `CameraStatus.OFFLINE` with `is_live=False`.
- **Runtime Derivation Rule**: Camera existence in the database no longer equals `ONLINE`. A camera is classified as `ONLINE` or `MEDIA_ACTIVE` only when empirical socket or HTTP WHEP probing verifies stream negotiation.
- **Telemetry Separation**: Configured metadata (name, code, district, GIS lat/lng) is strictly decoupled from observed runtime metadata (measured FPS, codec, resolution, latency) and operational health status.

---

## 2. Camera Data Ownership & Schema Traceability

| Layer | Source / Store | Component | Schema / Type | Mutability |
|---|---|---|---|---|
| **Authoritative Registry** | `cameras` table in PostgreSQL / SQLite | `Camera` SQLAlchemy Model | `id`, `stream_id`, `camera_code`, `name`, `latitude`, `longitude`, `district`, `station`, `department_id` | Read / Admin Update |
| **Observed Runtime Metadata** | In-memory socket probe & OpenCV capture | `StreamDiagnosticProbe` (`streams.py`) | `measured_fps`, `observed_codec`, `resolution_w`, `resolution_h`, `pos_msec` | Dynamic / Ephemeral |
| **Runtime Health State** | Redis Cache / Real-time socket check | `GET /api/v1/streams/{id}/status` | `ONLINE`, `MEDIA_ACTIVE`, `OFFLINE`, `AUTH_ERROR`, `DEGRADED` | Dynamic (TTL 30s) |
| **Client Visualization** | React Query / Zustand store | `<LiveOperationsPage />`, `<StatewideMapPage />` | GeoJSON FeatureCollection | Read-only Consumer |

---

## 3. Audit of Camera Onboarding & Catalog Endpoints

### 1. Database Query: `GET /api/v1/cameras`
- Fetches real rows from the `cameras` table via `camera_service.get_all_cameras()`.
- Supports multi-parameter filtering: `district`, `department_id`, `camera_type`, `status`.
- Returns genuine GIS coordinates: e.g., `CAM-AHM-01` (lat: 23.0125, lng: 72.5085).

### 2. Stream Resolution: `GET /api/v1/streams/{camera_id}/status`
- Takes the requested `camera_id` (e.g. `cam01` or `1`).
- Resolves the camera entity from the database registry.
- Performs an authentic network socket handshake to `103.250.160.189:8554`.
- If the socket fails, returns `status: "OFFLINE"` with `error_details`. It never lies or defaults to `ONLINE`.

---

## 4. Remediation Implemented

```diff
--- a/backend-orchestrator/app/services/camera_service.py
+++ b/backend-orchestrator/app/services/camera_service.py
@@ -147,8 +147,8 @@
-                    status=CameraStatus.ONLINE,
-                    is_live=True,
+                    status=CameraStatus.OFFLINE,
+                    is_live=False,
```

---

## 5. Acceptance Criteria Verification

- [x] No `for i in range(1, 31)` operational camera synthesis exists.
- [x] Hardcoded `ONLINE` on camera creation permanently eliminated.
- [x] Configured metadata cleanly separated from runtime observed telemetry.
- [x] Authoritative database ownership established.

**Phase Status: PASS**
