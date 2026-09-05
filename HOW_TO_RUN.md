# Gujarat Sentinel — How to Run Backends & Frontend

This guide outlines the official steps for starting, configuring, and running the **Gujarat Sentinel CCTV Surveillance Platform** services and web frontend.

---

## 🚀 Option 1: Fast Developer Mode (Local Terminals)

This is the fastest, lightweight method for local development without running full Docker containers.

### Prerequisites
* **Python**: 3.11+ installed and in PATH
* **Node.js**: v18+ and npm installed

---

### Terminal 1: Central Backend Orchestrator
Handles the 30-camera RTSP supervisor, AI scheduling, database persistence (PostgreSQL with automatic SQLite fallback `sentinel_platform.db`), and Section 65B HMAC evidence.

```powershell
cd backend-orchestrator
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Base URL**: `http://localhost:8000`
* **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Fleet Telemetry Endpoint**: [http://localhost:8000/api/v1/cameras/health/summary](http://localhost:8000/api/v1/cameras/health/summary)

---

### Terminal 2: AI Computer Vision & ANPR Microservice
Executes YOLOv8 person/vehicle detection, ByteTrack tracking, and PaddleOCR/EasyOCR license plate recognition.

```powershell
cd ai-detection
python -m uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload
```
* **API Base URL**: `http://localhost:8006`
* **Interactive Swagger Docs**: [http://localhost:8006/docs](http://localhost:8006/docs)
* **Health Endpoint**: [http://localhost:8006/health](http://localhost:8006/health)

---

### Terminal 3: Police Surveillance Video Wall Frontend
React 18 + Vite situational awareness UI, interactive Leaflet GIS map, 30-camera live grid, and real-time ANPR triage.

```powershell
cd frontend
npm install   # Run once on first setup
npm run dev
```
* **Surveillance Dashboard Web UI**: [http://localhost:3001](http://localhost:3001)

---

## ⚡ Option 2: Unified Platform Runner

The repository contains automated orchestration scripts that launch and monitor all processes in topological order:

### Windows PowerShell
```powershell
# Interactive menu and launch
.\run.ps1
```

### Cross-Platform Python CLI
```bash
# Start full application stack
python scripts/run.py --start

# Start only backend services and databases
python scripts/run.py --backend-only

# Start only frontend Video Wall UI
python scripts/run.py --frontend-only

# Start only AI computer vision microservice
python scripts/run.py --ai-only

# Check live health status across all services and ports
python scripts/run.py --status

# Run dependency & toolchain diagnostics
python scripts/run.py --doctor

# Stop all running application processes
python scripts/run.py --stop
```

---

## 🐳 Option 3: Full Docker Infrastructure Stack

For testing the complete enterprise microservices topology (PostgreSQL 16 + PostGIS, Redis 7, Apache Kafka, MinIO S3, OpenSearch, Prometheus, Grafana, and Models 1–4):

```powershell
# Windows PowerShell automated launcher:
.\start_all_backends.ps1

# Or standard Docker Compose command:
docker compose up -d
```

---

## 🌐 Live Service Endpoints & Access Points

| Component / Subsystem | Local URL | Description |
|---|---|---|
| **👑 Police Command Center UI** | [http://localhost:3001](http://localhost:3001) | React Situational Awareness Video Wall |
| **🌐 Central Brain Orchestrator** | [http://localhost:8000/docs](http://localhost:8000/docs) | FastAPI Brain, Section 65B HMAC, Officer Auth |
| **🤖 AI Vision & ANPR Engine** | [http://localhost:8006/docs](http://localhost:8006/docs) | YOLOv8 + ByteTrack + PaddleOCR Microservice |
| **📹 30-Camera Live Telemetry** | [http://localhost:8000/api/v1/cameras/health/summary](http://localhost:8000/api/v1/cameras/health/summary) | Live fleet health & decode rates |
| **⚡ Hybrid API Gateway** | [http://localhost:8000](http://localhost:8000) | Go/FastAPI Gateway |
| **🗺️ Model 1 — CCTV Registry & GIS** | [http://localhost:8001/docs](http://localhost:8001/docs) | PostGIS spatial queries & camera registry |
| **📹 Model 2 — Unified Viewer** | [http://localhost:8002/docs](http://localhost:8002/docs) | Video ingestion & ANPR pipeline |
| **🔌 Model 3 — VMS Federation** | [http://localhost:8003/actuator/health](http://localhost:8003/actuator/health) | Spring Boot VMS integration |
| **🛣️ Model 4 — Trajectory Hub** | [http://localhost:8004/health](http://localhost:8004/health) | Multi-camera trajectory store |
| **📊 Grafana SRE Dashboards** | [http://localhost:3000](http://localhost:3000) | SOC command metrics (`admin` / `admin`) |
| **📦 MinIO S3 Console** | [http://localhost:9005](http://localhost:9005) | Evidence clips (`minioadmin` / `minioadmin`) |
| **🔍 OpenSearch Dashboards** | [http://localhost:5601](http://localhost:5601) | Forensic logs & event store |

---

## 👮 Police Officer Demo Credentials

Use these credentials to log in to the Frontend Web UI:

* **Officer Badge ID**: `POLICE-AHM-042`
* **Password**: `Sentinel@2026`
* **Jurisdiction**: Ahmedabad City Police / State Cyber Command
* **Assigned Role**: `SUPERVISOR` / `ADMIN` (Full operational clearance)

---

## 🧪 Running Automated Tests

```bash
# Run backend orchestrator test suite (21 tests):
python -m pytest backend-orchestrator/tests -v

# Run AI detection test suite (22 tests):
python -m pytest ai-detection/tests -v

# Run frontend type-check & build:
cd frontend && npm run build
```

---

## ⚠️ Troubleshooting: `[WinError 10013]` (Port Already In Use)

If you see:
```text
ERROR: [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions
```
This means another process is already listening on that port (usually port `8000` or `8006`).

**To free port 8000 instantly in PowerShell:**
```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**To free port 8006:**
```powershell
Get-NetTCPConnection -LocalPort 8006 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

