# Gujarat Sentinel — Hybrid CCTV Surveillance & ANPR Platform

[![CI/CD](https://img.shields.io/badge/CI%2FCD-ArgoCD%20%7C%20Helm-blue)](infra/helm/)
[![Architecture](https://img.shields.io/badge/Architecture-Hybrid%20Modular%20%28Models%201--4%29-green)](#architecture)
[![Telemetry](https://img.shields.io/badge/Observability-OpenTelemetry%20%7C%20Prometheus%20%7C%20Grafana-orange)](infra/grafana/)
[![Standard](https://img.shields.io/badge/Standards-2025--2026%20State%20Police%20Surveillance-purple)](#key-features)

> A secure, vendor-neutral, modular, and horizontally scalable hybrid CCTV video surveillance platform engineered for State Police and Safe City initiatives (modeled on Gujarat Sentinel).

---

## 🏛️ System Architecture

```mermaid
graph TB
    Client["Unified Command Center UI / External Systems"] --> GW["Hybrid API Gateway (:8000)<br/>Go / Gin • Reverse Proxy • Cross-Model Orchestrator"]
    
    subgraph "Core Hybrid Platform"
        GW --> M1["Model 1 (:8001)<br/>Python / FastAPI<br/>Centralised CCTV Registry & GIS"]
        GW --> M2["Model 2 (:8002)<br/>Python / FastAPI<br/>Unified Viewing & Metadata Analytics (ANPR)"]
        GW --> M3["Model 3 (:8003)<br/>Java 21 / Spring Boot 3.4<br/>VMS Federation & Middleware"]
        GW --> M4["Model 4 (:8004)<br/>Go / Gin<br/>Central VMS & Vehicle Tracking"]
    end
    
    subgraph "Event Bus & Storage Tier"
        M1 --> PG[("PostgreSQL 16 + PostGIS")]
        M2 --> PG
        M3 --> PG
        M4 --> PG
        M2 --> OS[("OpenSearch 2.17<br/>Event Search")]
        M2 --> S3[("MinIO (S3)<br/>Evidence & Clips")]
        M4 --> S3
        
        M1 -.->|CloudEvents| KF["Apache Kafka 7.7<br/>sentinel.* topics"]
        M2 -.->|Detection Events| KF
        KF -.->|Trajectory Stream| M4
        M3 -.->|Federation Events| KF
    end
    
    subgraph "Edge Ingest & Simulators"
        SIM["MediaMTX RTSP Simulator (:8554)<br/>50 Heterogeneous Streams"] --> M2
        M2 --> EXT["Government Mock APIs (:8090)<br/>VAHAN • SARTHI • eGujCop • AFIS • NAFIS"]
        M3 --> VMS_A["Mock VMS A (:9001)<br/>Hikvision ISAPI"]
        M3 --> VMS_B["Mock VMS B (:9002)<br/>Dahua DSS"]
    end
```

---

## 🚀 Models Breakdown

| Model | Purpose | Tech Stack | Key Capabilities | Port |
|---|---|---|---|---|
| **Model 1** | **CCTV Registry & GIS** | Python 3.12, FastAPI, PostGIS, OPA, OIDC | Camera metadata catalog, PostGIS spatial radius queries (`ST_DWithin`), coverage gap heatmaps, department RBAC, background health poller. | `:8001` |
| **Model 2** | **Unified Viewing & ANPR** | Python 3.12, FastAPI, PyAV, YOLOv8n, PaddleOCR, OpenSearch | RTSP TCP consumers, PTS-based timing, exponential backoff (5s→60s), YOLO vehicle detection + PaddleOCR plate recognition, VAHAN/eGujCop watchlist matching, OpenSearch full-text search. | `:8002` |
| **Model 3** | **VMS Federation** | Java 21, Spring Boot 3.4, Flyway, WebFlux | Strategy adapter pattern for legacy & proprietary VMS (Hikvision ISAPI, Dahua DSS, ONVIF), PTZ control, camera auto-discovery, scheduled health monitors. | `:8003` |
| **Model 4** | **Central VMS & Tracking** | Go 1.23, Gin, pgx/v5, Kafka, S3 | Real-time Kafka consumer aggregating detections into multi-camera vehicle trajectories, encounter correlation, video clip extraction & S3 archiving. | `:8004` |
| **Hybrid Gateway** | **Gateway & Orchestrator** | Go 1.23, Gin, Prometheus, OTel | Unified reverse proxy with cross-model aggregation (`/api/v1/orchestrate/vehicle/:plate`, `/api/v1/orchestrate/camera/:id`, `/api/v1/orchestrate/platform/summary`). | `:8000` |

---

## ⚡ Quickstart & Local Deployment

### Prerequisites
- Docker & Docker Compose (v2.20+)
- Python 3.11+ (for running evaluation scripts)
- Make

### 1. Start the Complete Stack
```bash
# Clone and prepare environment
cp .env.example .env

# Launch all 20+ infrastructure and model containers
docker compose up -d
```

### 2. Verify System Health
```bash
make health
# Or run direct query:
curl -s http://localhost:8000/ready | jq .
```

### 3. Seed Cameras & Watchlist
```bash
python scripts/seed/seed_cameras.py
```

### 4. Run End-to-End Evaluation Scenario
```bash
python scripts/demo/hackathon_scenario.py --plate "GJ 01 AB 1234"
```

---

## 🌐 Endpoints & Dashboards

| Service / Interface | URL | Credentials / Notes |
|---|---|---|
| **Hybrid API Gateway** | `http://localhost:8000` | Unified API entry point |
| **Grafana Platform Dashboard** | `http://localhost:3000` | `admin` / `grafana_admin_pass` |
| **OpenSearch Dashboards** | `http://localhost:5601` | Full-text surveillance event exploration |
| **Kafka UI** | `http://localhost:8082` | Real-time Kafka topic inspector |
| **Keycloak IAM** | `http://localhost:8080` | `admin` / `admin_password` (Realm: `sentinel`) |
| **MinIO Storage Console** | `http://localhost:9001` | `minio_access_key` / `minio_secret_key` |
| **Model 1 API Docs** | `http://localhost:8001/docs` | Swagger UI for Camera Registry & GIS |
| **Model 2 API Docs** | `http://localhost:8002/docs` | Swagger UI for Streams & ANPR |
| **Model 3 Swagger** | `http://localhost:8003/swagger-ui.html` | OpenAPI for VMS Federation |
| **Model 4 API Docs** | `http://localhost:8004/health` | Central VMS & Tracking |

---

## ☸️ Production Kubernetes & GitOps

The platform includes production Helm charts and ArgoCD ApplicationSets:

```bash
# Deploy with Helm
helm upgrade --install sentinel-hybrid infra/helm/sentinel-hybrid \
  --namespace sentinel \
  --create-namespace \
  -f infra/helm/sentinel-hybrid/values.yaml

# Apply ArgoCD ApplicationSets for multi-cluster state deployment
kubectl apply -f infra/argocd/applications.yaml
```

---

## 🔒 Security & Compliance
- **Authentication**: Keycloak OpenID Connect (OIDC) with RS256 JWT tokens.
- **Authorization**: Open Policy Agent (OPA) with fine-grained Rego policies enforcing department-level camera isolation.
- **Auditing**: Tamper-evident immutable audit logs on every GIS and camera operation published to `sentinel.audit.events`.
