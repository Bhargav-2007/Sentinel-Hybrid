# Final Service Inventory

**Audit Date**: 2026-09-04T15:23:25+05:30  
**Phase Identifier**: `PHASE_27`  
**Classification**: Production Systems Catalogue  

---

## 1. Authoritative Production Service Inventory

### Service 1: `sentinel-backend-orchestrator`
- **Purpose**: Central platform brain, REST API gateway, authoritative camera registry, case management, WHEP stream proxy, Section 65B forensic hashing, WebSocket alerts.
- **Runtime**: Python 3.10+ / FastAPI / Uvicorn ASGI
- **Port**: `8000/TCP`
- **Dependencies**: `ai-detection` (:8006), PostgreSQL/SQLite, Redis (:6379), Kafka (:9092)
- **Database**: PostgreSQL 16 PostGIS (`sentinel` on :5432) with local SQLite fallback (`sentinel_platform.db`)
- **Kafka Topics**: `sentinel.camera.events`, `sentinel.alert.events`, `sentinel.audit.events`
- **Health Endpoints**: `GET /health`, `GET /api/v1/orchestrator/system-health`
- **Status**: **ACTIVE & HARDENED**
- **Automated Tests**: `pytest backend-orchestrator/tests -q` (**14/14 Passed**)
- **Deployment**: Docker container / native Python ASGI worker

---

### Service 2: `sentinel-ai-detection`
- **Purpose**: Computer vision neural inference microservice: YOLOv8n object detection (vehicles, pedestrians), ByteTrack multi-object tracker, EasyOCR license plate reader, temporal fusion, and anti-hallucination confidence filter.
- **Runtime**: Python 3.10+ / PyTorch 2.5+ / DirectML / CUDA
- **Port**: `8006/TCP`
- **Dependencies**: OpenCV, Ultralytics YOLOv8, EasyOCR, NumPy
- **Database**: None (Stateless inference engine)
- **Kafka Topics**: None directly (consumed via REST API)
- **Health Endpoint**: `GET /health`
- **Status**: **ACTIVE & HARDENED**
- **Automated Tests**: `pytest ai-detection/tests -q` (**22/22 Passed**)
- **Deployment**: Docker container / GPU-accelerated edge process

---

### Service 3: `sentinel-frontend`
- **Purpose**: Police command center surveillance UI: 30-camera live grid wall, vehicle 360° dossier, statewide GIS map, case management, Section 65B studio, system health matrix.
- **Runtime**: React 18 / TypeScript / Vite / TailwindCSS
- **Port**: `5173/TCP` (Dev) / `80/TCP` (Production Nginx)
- **Dependencies**: `backend-orchestrator` (:8000) REST & WebSockets, MediaMTX (:8889 WHEP)
- **Database**: None (Browser SPA)
- **Kafka Topics**: None
- **Health Endpoint**: Client SPA (`/live`)
- **Status**: **ACTIVE & HARDENED**
- **Automated Tests**: `npm run build` (0 TypeScript errors, 5.91s build time)
- **Deployment**: Static asset bundle served via Nginx or CDN

---

### Service 4: `sentinel-model1-registry`
- **Purpose**: Specialized GIS spatial indexing and bounding-box queries.
- **Runtime**: Python 3.10+ / FastAPI / PostGIS
- **Port**: `8001/TCP`
- **Dependencies**: PostgreSQL PostGIS, asyncpg
- **Database**: `sentinel_model1`
- **Kafka Topics**: `sentinel.camera.events`
- **Health Endpoint**: `GET /health`
- **Status**: **PARTIAL** (GIS queries mirrored natively into `backend-orchestrator` for single-node efficiency).
- **Deployment**: Standalone container

---

### Service 5: `sentinel-model2-viewer`
- **Purpose**: Batch stream ingestion worker and offline ANPR analytics consumer.
- **Runtime**: Python 3.10+ / FastAPI / OpenCV
- **Port**: `8002/TCP`
- **Dependencies**: OpenCV, PaddleOCR
- **Database**: `sentinel_model2`
- **Kafka Topics**: `sentinel.detection.events`
- **Health Endpoint**: `GET /health`
- **Status**: **PARTIAL** (Live real-time inference executed by `ai-detection` :8006).
- **Deployment**: Standalone container

---

### Service 6: `sentinel-model3-vms`
- **Purpose**: Multi-vendor legacy VMS protocol federation (Milestone, ONVIF, Hikvision, Dahua).
- **Runtime**: Java 21 / Spring Boot 3.4 / Spring Data JPA
- **Port**: `8003/TCP`
- **Dependencies**: JVM 21, Kafka, PostgreSQL
- **Database**: `sentinel_model3`
- **Kafka Topics**: `sentinel.vms.federation`
- **Health Endpoint**: `GET /actuator/health`
- **Status**: **PARTIAL** (Integration bridge for enterprise VMS deployments).
- **Deployment**: Standalone JAR container

---

### Service 7: `sentinel-model4-evidence`
- **Purpose**: Spatial corridor tracking, MinIO evidence packaging, and Go-based Section 65B signature validation.
- **Runtime**: Go 1.23 / Gorilla Mux / MinIO Client
- **Port**: `8004/TCP`
- **Dependencies**: Go 1.23, Sarama Kafka, MinIO SDK
- **Database**: PostgreSQL `sentinel_model4` / MinIO S3
- **Kafka Topics**: `sentinel.evidence.events`
- **Health Endpoint**: `GET /healthz`
- **Status**: **PARTIAL** (High-throughput Go service; HMAC functions mirrored natively in orchestrator).
- **Deployment**: Compiled Go binary
