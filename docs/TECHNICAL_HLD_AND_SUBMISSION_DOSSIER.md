# GUJARAT POLICE INNOVATION CHALLENGE 2026
## CCTV INTEGRATION HACKATHON · TECHNICAL HIGH-LEVEL DESIGN (HLD) & SUBMISSION DOSSIER

---

### Executive Summary
- **Platform Name**: Gujarat Sentinel Hybrid Modular VMS & Intelligence Framework
- **Official Problem Statement**: Integrated Video Management & Analytics Platform for 26 State Government Departments ([sentinel.gujarat.gov.in/problems](https://sentinel.gujarat.gov.in/problems))
- **Target Scale**: ~80,000+ CCTV Cameras across Gujarat
- **Core Innovation**: Hybrid Federation Architecture where video stays decentralized on departmental NVRs/VMS, and only events, metadata, AI analytics, and on-demand live streams are correlated centrally via a high-throughput event bus (CloudEvents over Apache Kafka).
- **Observability Stack**: Integrated Prometheus time-series scraping, OpenTelemetry distributed tracing, PostgreSQL relational queries, and an embedded multi-dashboard Grafana 11.3 SRE Command Suite.

---

## 1. Reference Models & Architecture Alignment

The Sentinel Platform unifies all five reference models into a cohesive, production-grade hybrid architecture:

| Model | Component Description | Technology Stack | Port |
|---|---|---|---|
| **Model 1** | **Centralized Registry & PostGIS GIS Engine** | Python 3.12, FastAPI, PostgreSQL 16 + PostGIS, Leaflet | `:8001` |
| **Model 2** | **Unified Viewing & ANPR Processing** | PyAV, YOLOv8n, PaddleOCR, WebRTC (WHEP), HLS Relay | `:8002` |
| **Model 3** | **VMS Federation Middleware** | Java 21, Spring Boot 3.4, Hikvision ISAPI / Dahua DSS Adapters | `:8003` |
| **Model 4** | **Central Trajectory Tracking & S3 Object Store** | Go 1.23, Gin Engine, Apache Kafka, MinIO S3 Object Store | `:8004` |
| **Hybrid Gateway** | **Reverse Proxy & RBAC Policy Orchestrator** | Go Gin, Open Policy Agent (OPA), Redis Cache | `:8000` |
| **Frontend SOC** | **Unified 24×7 Command Center Web Application** | React 18, Vite, TypeScript, Tailwind, TanStack Query, Zustand | `:3001` / `:5173` |
| **Grafana SRE** | **Full-Stack Operational Observability Suite** | Grafana 11.3, Prometheus 2.55, OpenTelemetry Collector | `:3000` |

---

## 2. Statewide Scalability Strategy (~80,000 Cameras)

### The Decentralized Edge-Federation Paradigm
Attempting to ingest 80,000 raw 1080p RTSP streams (each @ 4 Mbps) centrally would require:
$$\text{Total Bandwidth} = 80,000 \times 4\text{ Mbps} = 320\text{ Gbps (Prohibitive cost)}$$

**The Sentinel Solution**:
1. **Video Stays at Edge/NVR**: Video recordings remain on existing departmental NVRs (7 to 30 day local retention).
2. **Metadata-Only Ingestion**: Edge inference or lightweight regional gateways process video locally and stream only lightweight CloudEvents JSON (vehicle plate, timestamp, bounding box, GPS coordinates, confidence) to Central Kafka.
   $$\text{Metadata Bandwidth} = 80,000 \times 1.2\text{ Kbps} \approx 96\text{ Mbps (99.97% bandwidth reduction!)}$$
3. **On-Demand Video Pull**: Full-bandwidth WebRTC/HLS streams are only requested by the Central SOC when an officer opens a video wall slot or during an active APB pursuit.

---

## 3. Infrastructure Sizing & Compute Planning

| Tier | Deployment Scope | Hardware / Compute Sizing | Storage / Retention Policy |
|---|---|---|---|
| **Edge / District Tier** | 33 District Police Headquarters + RTO / Municipal Hubs | 4-Core x86 or NVIDIA Jetson Orin Edge per 16–32 Cameras | Local NVR 15–30 Days (Direct Attached Storage) |
| **Regional Transit Hubs** | 6 Regional Command Centers (Ahmedabad, Surat, Rajkot, Vadodara, Gandhinagar, Junagadh) | Dual Intel Xeon Silver, 64 GB RAM, 2x NVIDIA L4 GPU per 250 ANPR Feeds | Local Warm Buffer 7 Days |
| **State Cyber Command Hub (Gandhinagar)** | Centralized State Cloud / SDC | 4x Kubernetes Nodes (64 vCPU, 256 GB RAM), Kafka Cluster (3 Brokers), PostgreSQL + PostGIS HA Cluster | MinIO S3 Cold Archive (1 Year Metadata & Snapshots, Hash Chained) |

---

## 4. Government Database Integration Matrix

The Sentinel platform is pre-architected with adapter contracts for critical state and national databases:

| Database / System | Department Ownership | Integration Mechanism | Sentinel Operational Use Case |
|---|---|---|---|
| **eGujCop (CCTNS)** | Gujarat Police | REST API + Webhooks | Real-time hotlist sync for wanted criminals, FIR suspects, and stolen vehicles |
| **VAHAN 4.0** | Ministry of Road Transport (MoRTH) / RTO | REST API / Cache | Instant vehicle ownership, chassis number, make/model, and RC status lookup |
| **SARTHI** | Transport Department | REST API | Driver license validation and commercial vehicle compliance |
| **AFIS / NAFIS** | NCRB / State Crime Record Bureau | Biometric Vector Bus | Multi-modal facial vector correlation for suspect crossing alerts |

---

## 5. Indian Evidence Act Section 65B Compliance & Security

### Cryptographic Hash Chaining
All extracted video snippets, ANPR snapshot stills, and movement timeline records are hashed upon ingestion with **SHA-256**.
- **HMAC Signatures**: Each checkpoint encounter is digitally stamped with the camera's private hardware key and timestamp.
- **Section 65B Certified Export**: The platform automatically generates a Court Evidence Package with officer badge ID, GPS coordinates, and hash verification certificates ready for judicial submission.
- **Role-Based Access Control (RBAC)**: Enforced via Open Policy Agent (OPA) with strict district-level data scoping and an emergency Break-Glass Protocol requiring mandatory incident justifications.

---

## 6. Official Sandbox Compliance Matrix

| # | Integration Requirement | Implementation Verification |
|---|---|---|
| **1** | **Forced RTSP over TCP** | Verified in Model 2, OpenCV (`rtsp_transport;tcp`), GStreamer (`protocols=tcp`), and DeepStream (`select-rtp-protocol=4`). |
| **2** | **PTS Monotonic Timing** | All speed and interval calculations strictly use PTS deltas (`CAP_PROP_POS_MSEC` / AVFrame PTS), ignoring wall-clock arrival variations. |
| **3** | **Non-Fatal Decode Handling** | PyAV stream demux loop catches `AVError`, RPS errors, and POC reference warnings on mid-stream joins without disconnecting. |
| **4** | **Exponential Backoff** | Configured with a 2.0s base delay and 30.0s cap (`min(2.0 * 2^(count-1), 30.0)`). |
| **5** | **Dynamic Catalogue Ingestion** | Reads streams dynamically from `/api/ingest` with multi-tier failover. |
| **6** | **Mixed Codecs & Resolutions** | Handles H.264, H.265 (HEVC), 720p, 1080p, 2K, and 4K streams seamlessly. |

---

## 7. Full-Stack SRE Observability Suite (Grafana + Prometheus + OTel)

To ensure non-stop 24×7 operational reliability across 80,000 cameras and 4 AI microservices, Gujarat Sentinel embeds a dual-plane observability stack:

### A. Dual-Plane Observability Paradigm
1. **Command Plane (React SOC)**: Operator-facing tactical intelligence UI with sub-second WebSocket pushes, interactive Leaflet tactical GIS maps, live video walls, and instant APB incident triage.
2. **Telemetry Plane (Grafana SRE)**: Engineering & SRE observability wall with Prometheus time-series metrics, OpenTelemetry distributed tracing spans, and direct PostgreSQL query capabilities.

### B. 4 Production-Grade Provisioned Dashboards

```
infra/grafana/
├── provisioning/
│   ├── datasources/
│   │   └── datasource.yml          ← Auto-provisions Prometheus & PostgreSQL
│   └── dashboards/
│       └── dashboards.yml          ← Auto-loads all JSON dashboards on boot
└── dashboards/
    ├── sentinel-overview.json       ← Dashboard 1: SOC Command & Model Health
    ├── sentinel-anpr.json           ← Dashboard 2: ANPR, YOLOv8 & OCR Pipeline
    ├── sentinel-incidents.json      ← Dashboard 3: APB Threat Triage, MTTA & MTTR
    └── sentinel-infrastructure.json ← Dashboard 4: SRE Compute, MinIO S3 & Databases
```

| Dashboard UID | Name | Key Monitored Metrics | Operational Audience |
|---|---|---|---|
| `sentinel-overview` | **SOC Command Overview** | 4 AI Models Health (up/down), P99 Latency per model, Kafka message rate/sec, Active stream bitrates & glass-to-glass latency | SOC Supervisors & Duty Officers |
| `sentinel-anpr` | **ANPR & AI Vision Deep-Dive** | YOLOv8 vs PaddleOCR latency split, OCR character confidence, vehicle classification pie chart, corridor speed delta (PTS) | AI Engineers & Traffic Commissioners |
| `sentinel-incidents` | **APB Incident Intelligence & Response** | Active Critical APBs, Mean Time to Acknowledge (MTTA), Mean Time to Resolve (MTTR), PCR unit dispatch volume, Break-Glass audit events | Police Dispatchers & District Superintendents |
| `sentinel-infrastructure` | **SRE Cluster Infrastructure** | Cluster CPU/RAM utilization, MinIO S3 PutObject IOPS, PostgreSQL connection pool depth, Redis cache hit ratio (VAHAN lookups) | SRE Team & State Cyber Command |

### C. Embedding & TV Kiosk Mode
- **Zero-Friction Iframe Integration**: Configured with `GF_SECURITY_ALLOW_EMBEDDING=true` and `GF_AUTH_ANONYMOUS_ENABLED=true` to enable direct, seamless embedding inside the React Analytics console without requiring separate logins.
- **TV Kiosk Mode**: Appends `&kiosk=tv` and `&theme=dark` to render clean full-screen dashboards ideal for SOC wall video monitors and multi-display control room arrays.

---

## 8. Deployment & Demonstration Runbook

### Quick Start Commands

```bash
# 1. Start all infrastructure and microservices in Docker
docker compose up -d

# 2. Automatically seed synthetic cameras and test streams
python scripts/seed/seed_cameras.py

# 3. Provision Grafana datasources and all 4 SOC dashboards
python scripts/demo/provision_grafana.py

# 4. Start the Frontend SOC Command Center
cd frontend
npm run dev

# 5. Execute the End-to-End Hackathon Demo Scenario
python scripts/demo/hackathon_scenario.py
```

### Access Points
- **Frontend SOC Command Center**: `http://localhost:3001` (or `http://localhost:5173`)
- **Grafana Live Observability Suite**: `http://localhost:3000`
- **Prometheus Metric Explorer**: `http://localhost:9090`
- **Kafka Cluster UI**: `http://localhost:8082`
- **MinIO Object Storage Console**: `http://localhost:9005`
- **Hybrid Gateway Swagger / OpenAPI**: `http://localhost:8000/docs`

---

## 9. Conclusion: Why Gujarat Sentinel Wins the Hackathon

1. **True Hybrid Federation**: Avoids 320 Gbps bandwidth collapse by keeping video local and streaming only CloudEvents metadata.
2. **Production-Grade Engineering**: 4 microservices across 3 modern languages (Python, Go, Java) with zero single-points-of-failure.
3. **Full Legal Compliance**: Section 65B certified evidence export with HMAC signatures and SHA-256 cryptographic chain of custody.
4. **Cinematic Police Control Room UI**: Dark-mode tactical glassmorphism, animated radar sweeps, live APB tickers, and interactive video walls.
5. **Turnkey SRE Observability**: Built-in Grafana 11.3 suite with Prometheus, OTel, and 4 dedicated operational dashboards for instant state-wide deployment.
