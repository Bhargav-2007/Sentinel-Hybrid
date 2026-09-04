# Gujarat Sentinel-Hybrid: Camera Data Ownership Architecture

**Classification**: Core Architecture Document  
**Target Subsystems**: `backend-orchestrator`, `backend-model1`, `frontend`  
**Last Updated**: 2026-09-04  

---

## 1. Principle of Data Ownership

In the Sentinel-Hybrid platform, camera state is governed by a strict data ownership model. No single tier or consumer is permitted to invent, override, or synthesize camera identity or health state.

```mermaid
flowchart TD
    subgraph Authoritative Datastore
        DB[(PostgreSQL / SQLite: 'cameras')]
    end

    subgraph Orchestration Service
        CS[CameraService] -->|CRUD & GIS Queries| DB
        SP[StreamDiagnosticProbe] -->|Socket Probe :8554| GW[MediaMTX Gateway]
        RC[(Redis Cache: 'camera_status_cache')]
    end

    subgraph API Interface
        API1[GET /api/v1/cameras]
        API2[GET /api/v1/streams/{id}/status]
        API3[GET /api/v1/streams/{id}/whep]
    end

    subgraph Client Application
        WALL[LiveOperationsPage Camera Grid]
        MAP[StatewideMapPage GIS Map]
        MGMT[CameraManagementPage]
    end

    CS --> API1
    SP --> API2
    SP --> RC
    API1 --> WALL
    API1 --> MAP
    API1 --> MGMT
    API2 --> WALL
```

---

## 2. Layer-by-Layer Ownership Specification

### 1. Authoritative Configuration Source
- **Owner**: PostgreSQL `cameras` table (managed via `app.models.camera.Camera`).
- **Attributes Owned**:
  - `id`: Unique identifier (`CAM-AHM-01` or numeric string).
  - `stream_id`: Upstream stream channel (`cam01`, `cam02`, etc.).
  - `name`: Official checkpoint name (e.g. `SG Highway — Prahladnagar Junction`).
  - `latitude`, `longitude`: WGS84 GIS spatial coordinates.
  - `district`: Administrative district (e.g. `Ahmedabad City`, `Gandhinagar`).
  - `station`: Jurisdiction police station.
  - `department_id`: Multi-department tenancy identifier (`POLICE`, `TRANSPORT_RTO`, `FOREST_WILDLIFE`, `BORDER_SECURITY`).
  - `camera_type`: `ANPR`, `PTZ`, `BULLET`, `DOME`, `THERMAL`.

### 2. Runtime Health Source
- **Owner**: In-memory / Redis cache evaluated by `backend-orchestrator/app/api/v1/streams.py`.
- **Attributes Owned**:
  - `status`: `MEDIA_ACTIVE`, `ONLINE`, `OFFLINE`, `AUTH_ERROR`, `DEGRADED`.
  - `network_reachable`: Boolean socket TCP reachability.
  - `authenticated`: Boolean RTSP 200 vs 401 response.
  - `latency_ms`: Round-trip TCP handshake time.
  - `last_checked`: UTC timestamp of latest probe.
- **Rule**: Never stored permanently in the database table as a static default. Evaluated on-demand or refreshed on a 30-second TTL cache cycle.

### 3. Observed Runtime Metadata Source
- **Owner**: OpenCV video decoder pipeline (`ai-detection` / `streams.py`).
- **Attributes Owned**:
  - `actual_fps`: Measured frame delivery frequency (e.g., 29.97 / 30.0 fps).
  - `actual_resolution`: Decoded width and height (e.g., `1920x1080`).
  - `actual_codec`: SDP payload descriptor (`H264/90000` or `H265/90000`).
  - `pos_msec`: Decoder presentation timestamp.

### 4. Frontend Consumer
- **Owner**: `frontend/src/features/live-operations/` and `frontend/src/features/gis/`.
- **Contract**: Read-only visualization. 
  - May **never** synthesize fallback department IDs via modulo arithmetic.
  - May **never** assume a camera is `ONLINE` without backend status confirmation.
  - If stream is unreachable, must show explicit `OFFLINE` or `NO STREAM` indicator.
