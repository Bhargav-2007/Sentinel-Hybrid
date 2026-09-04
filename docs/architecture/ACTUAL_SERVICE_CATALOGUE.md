# Gujarat Sentinel-Hybrid: Actual Service Catalogue

**Last Verified**: 2026-09-04  
**Authoritative Status**: Active Hardened Production Baseline  

---

## Service 1: Backend Orchestrator (`backend-orchestrator`)

- **Service Name**: `sentinel-backend-orchestrator`
- **Purpose**: Primary API gateway, authoritative camera registry, case management, Section 65B forensic hashing, WHEP stream proxy, and WebSocket broadcast.
- **Entrypoint**: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Port**: `8000/TCP`
- **Dependencies**: `ai-detection` (:8006), PostgreSQL/SQLite, Redis (:6379), Kafka (:9092)
- **Database**: PostgreSQL (`sentinel` on :5432) / SQLite fallback (`sentinel_platform.db`)
- **Kafka Topics**: `sentinel.camera.events`, `sentinel.alert.events`, `sentinel.audit.events`
- **Redis Channels**: `sentinel:alerts`, `sentinel:camera_health`
- **External Services**: MediaMTX CCTV Gateway (`103.250.160.189:8554`, `:8889`)
- **Health Endpoints**: `GET /health`, `GET /api/v1/orchestrator/system-health`
- **Deployment**: Docker container / standalone Python 3.10+ process
- **Status**: **ACTIVE**

---

## Service 2: AI Detection & Computer Vision (`ai-detection`)

- **Service Name**: `sentinel-ai-detection`
- **Purpose**: Real-time neural network inference microservice: YOLOv8n object detection (vehicles, pedestrians), ByteTrack multi-object tracking, and EasyOCR plate recognition.
- **Entrypoint**: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8006`
- **Port**: `8006/TCP`
- **Dependencies**: PyTorch 2.0+, Ultralytics YOLOv8, OpenCV, EasyOCR, NumPy
- **Database**: None (Stateless inference microservice)
- **Kafka Topics**: None directly (consumed via REST API)
- **Redis Channels**: None
- **External Services**: RTSP Video Streams (`rtsp://103.250.160.189:8554/stream/{cam_id}`)
- **Health Endpoint**: `GET /health`
- **Deployment**: Docker container / standalone Python 3.10+ process with GPU/DirectML acceleration
- **Status**: **ACTIVE**

---

## Service 3: Frontend Surveillance Dashboard (`frontend`)

- **Service Name**: `sentinel-frontend`
- **Purpose**: Police command center web UI: 30-camera live grid wall, vehicle 360° dossier, GIS statewide map, case management, Section 65B studio, and system health matrix.
- **Entrypoint**: `npm run dev` (dev on :5173) / Nginx container (prod on :80)
- **Port**: `5173/TCP` (dev), `80/TCP` (prod)
- **Dependencies**: `backend-orchestrator` (:8000) REST & WebSockets, MediaMTX (:8889 WHEP)
- **Database**: None (Browser client application)
- **Kafka Topics**: None
- **Redis Channels**: None
- **External Services**: WHEP streams from `103.250.160.189:8889`
- **Health Endpoint**: Client SPA (`/live`)
- **Deployment**: Static SPA bundle served via Nginx / Vite
- **Status**: **ACTIVE**

---

## Service 4: Camera Registry & GIS Service (`backend-model1`)

- **Service Name**: `sentinel-model1-registry`
- **Purpose**: Spatial GIS camera registry, bounding-box geographic queries, and department topology.
- **Entrypoint**: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8001`
- **Port**: `8001/TCP`
- **Dependencies**: PostGIS, asyncpg, FastAPI
- **Database**: PostgreSQL `sentinel_model1`
- **Kafka Topics**: `sentinel.camera.events`
- **Redis Channels**: Optional cache
- **External Services**: None
- **Health Endpoint**: `GET /health`
- **Deployment**: Docker container
- **Status**: **PARTIAL** (Functionality unified into `backend-orchestrator` for single-node efficiency).

---

## Service 5: Unified Viewer & ANPR Worker (`backend-model2`)

- **Service Name**: `sentinel-model2-viewer`
- **Purpose**: Batch stream ingestion worker and offline ANPR analytics consumer.
- **Entrypoint**: `python -m uvicorn app.main:app --host 0.0.0.0 --port 8002`
- **Port**: `8002/TCP`
- **Dependencies**: OpenCV, PaddleOCR / EasyOCR, FastAPI
- **Database**: PostgreSQL `sentinel_model2`
- **Kafka Topics**: `sentinel.detection.events`
- **Redis Channels**: None
- **External Services**: RTSP camera feeds
- **Health Endpoint**: `GET /health`
- **Deployment**: Docker container
- **Status**: **PARTIAL** (Live real-time inference is executed by `ai-detection` :8006).

---

## Service 6: VMS Federation Gateway (`backend-model3`)

- **Service Name**: `sentinel-model3-vms`
- **Purpose**: Legacy enterprise VMS protocol bridge supporting ONVIF, Milestone, Genetec, Hikvision, and Dahua NVRs.
- **Entrypoint**: `java -jar target/backend-model3-1.0.0.jar`
- **Port**: `8003/TCP`
- **Dependencies**: Java 21, Spring Boot 3, Spring Data JPA, Kafka
- **Database**: PostgreSQL `sentinel_model3`
- **Kafka Topics**: `sentinel.vms.federation`
- **Redis Channels**: Token cache
- **External Services**: Legacy proprietary VMS endpoints
- **Health Endpoint**: `GET /actuator/health`
- **Deployment**: Docker container / OpenJDK 21
- **Status**: **PARTIAL** (Integration bridge for multi-vendor legacy hardware).

---

## Service 7: Evidence Vault & Trajectory Router (`backend-model4`)

- **Service Name**: `sentinel-model4-evidence`
- **Purpose**: Spatial corridor velocity calculation, MinIO evidence archive, and Go-based Section 65B signature validation.
- **Entrypoint**: `./bin/server`
- **Port**: `8004/TCP`
- **Dependencies**: Go 1.23, MinIO Client SDK, Sarama Kafka
- **Database**: PostgreSQL `sentinel_model4` / MinIO S3
- **Kafka Topics**: `sentinel.evidence.events`
- **Redis Channels**: Rate limiting
- **External Services**: MinIO (:9000)
- **Health Endpoint**: `GET /healthz`
- **Deployment**: Docker container / compiled Go binary
- **Status**: **PARTIAL** (Compiled Go microservice; HMAC verification mirrored natively in orchestrator).
