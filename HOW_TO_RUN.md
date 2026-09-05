# Gujarat Sentinel — How to Run the Website & Services

This guide provides the official instructions for running the **Gujarat Sentinel Hybrid Surveillance Platform** website, backend microservices, and live officer demonstration.

---

## ⚡ Quick Start: Run the Website in 2 Minutes

If you want to launch the website immediately, choose one of the options below:

### Option A: Automated One-Command Launcher (Recommended)

From the project root directory in PowerShell or Terminal:

```powershell
# Automatically starts Backend Orchestrator (:8000), AI Engine (:8006), and Frontend Website (:3001)
.\run.ps1
```

Or using the cross-platform Python CLI:
```bash
python scripts/run.py --start
```

* **Website URL**: [http://localhost:3001](http://localhost:3001) (fallback: [http://localhost:5173](http://localhost:5173))
* **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Local Developer Terminals (Step-by-Step)

If you prefer starting services manually in separate terminal windows:

#### 1. Terminal 1: Frontend Website
```powershell
cd frontend
npm install        # Run once on first setup
npm run dev
```
* **Surveillance Dashboard Web UI**: [http://localhost:3001](http://localhost:3001)

> **Note:** The frontend can open immediately. For live CCTV streaming, plate queries, and Section 65B evidence generation, start the backend in Terminal 2.

#### 2. Terminal 2: Central Backend Orchestrator
Handles the 30-camera RTSP supervisor, plate search, correlation, watchlist alerts, and Section 65B HMAC evidence signing:
```powershell
cd backend-orchestrator
python -m pip install -r requirements.txt   # Run once on first setup
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Base URL**: `http://localhost:8000`
* **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Bandwidth Scalability API**: [http://localhost:8000/api/v1/orchestrator/bandwidth-savings](http://localhost:8000/api/v1/orchestrator/bandwidth-savings)

#### 3. Terminal 3: AI Detection & ANPR (Optional for live camera inference)
Runs YOLOv8 vehicle/person detection, ByteTrack tracking, and PaddleOCR license plate recognition:
```powershell
cd ai-detection
python -m pip install -r requirements.txt   # Run once on first setup
python -m uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload
```
* **AI Microservice**: [http://localhost:8006/docs](http://localhost:8006/docs)

---

## 🐳 Option C: Full Enterprise Docker Stack

To run the complete production microservices stack (PostgreSQL + PostGIS, Redis, Apache Kafka, MinIO S3, OpenSearch, Prometheus, Grafana, Models 1–4, and Hybrid Gateway):

```powershell
# Windows PowerShell automated launcher:
.\start_all_backends.ps1

# Or standard Docker Compose:
docker compose up -d

# Start the frontend website:
cd frontend
npm run dev
```

---

## 👮 Police Officer Demo Login Credentials

When the website opens at [http://localhost:3001](http://localhost:3001), log in with:

* **Officer Badge ID**: `POLICE-AHM-042`
* **Password**: `Sentinel@2026`
* **Clearance**: `SUPERVISOR` / `ADMIN` (Full operational clearance)
* *(Or click "Bypass / Dev Login" to enter immediately)*

---

## 🎯 5-Minute Officer Feature Tour on the Website

Once logged in, verify the core end-to-end police workflow:

1. **Live Video Wall (`/live`)**:
   - Displays real multi-department CCTV feeds across Gujarat (Police, GSRTC, Municipal, Panchayat, Health).
   - Toggle layouts (2x2, 3x3, 4x4) and view live camera frame rates.

2. **GIS Spatial Map (`/map`)**:
   - Interactive tactical map showing real GPS coordinates of Gujarat CCTV nodes.
   - Real-time green/red indicators for online/offline stream health.

3. **360° Plate Search & Investigation (`/investigate`)**:
   - Enter target plate `GJ01AA0001` in the search box.
   - Inspect the aggregated VAHAN 4.0 registration data, eGujCop hotlist status, and multi-camera sighting timeline.
   - View the reconstructed Dijkstra road corridor route and PTS transit speeds on the map.

4. **Real-Time Watchlist Alerts (`/alerts`)**:
   - Live stream of high-priority watchlist hits with confidence scores and threat levels.
   - Click the **"65B Evidence"** button on any alert to instantly download a court-admissible forensic dossier certified with SHA-256 HMAC signatures under the Indian Evidence Act.

5. **Statewide Telemetry & 80k Scalability (`/analytics`)**:
   - Inspect the **"Edge-Federated WAN Bandwidth & 80,000-Camera Scalability Model"** card.
   - Demonstrates how Sentinel Hybrid saves **99.95% WAN bandwidth** (reducing continuous load from 320 Gbps to 168 Mbps, saving **3,456 TB per day** across 80,000 cameras).

6. **Audit & Forensics Studio (`/audit`, `/cases`)**:
   - Review immutable chain-of-custody logs and break-glass emergency overrides conforming to the DPDP Act 2023.

---

## 🧪 Automated Officer Demo & Verification Script

To verify all 10 officer requirements plus 80k scalability in under 30 seconds via API tests:

```bash
# Run automated proof script:
python scripts/officer_demo.py --gateway http://localhost:8000

# Or via Makefile:
make officer-demo
```

---

## 🌐 Complete Service Endpoints Summary

| Subsystem | Port / URL | Description |
|---|---|---|
| **👑 Police Surveillance Website** | [http://localhost:3001](http://localhost:3001) | Tactical Situational Awareness Web UI |
| **🌐 Central Orchestrator** | [http://localhost:8000/docs](http://localhost:8000/docs) | Unified Brain, Vehicle-360, 65B Evidence |
| **🤖 AI Computer Vision Engine** | [http://localhost:8006/docs](http://localhost:8006/docs) | YOLOv8 + ByteTrack + PaddleOCR |
| **⚡ Hybrid API Gateway** | [http://localhost:8000](http://localhost:8000) | Reverse Proxy & Routing Layer |
| **🗺️ Model 1 — CCTV Registry & GIS** | [http://localhost:8001/docs](http://localhost:8001/docs) | PostGIS spatial queries & camera registry |
| **📹 Model 2 — Unified Viewer** | [http://localhost:8002/docs](http://localhost:8002/docs) | Video ingestion & ANPR pipeline |
| **🔌 Model 3 — VMS Federation** | [http://localhost:8003/actuator/health](http://localhost:8003/actuator/health) | Multi-vendor VMS adapters (Hikvision, Dahua) |
| **🛣️ Model 4 — Trajectory Hub** | [http://localhost:8004/health](http://localhost:8004/health) | Vehicle trajectory & clip store |
| **📊 Grafana SRE Dashboards** | [http://localhost:3000](http://localhost:3000) | System metrics (`admin` / `admin`) |
| **📦 MinIO S3 Console** | [http://localhost:9005](http://localhost:9005) | Legal evidence storage (`minioadmin` / `minioadmin`) |

---

## ⚠️ Troubleshooting & Common Fixes

### 1. Port Already In Use (`[WinError 10013]` or `EADDRINUSE`)
If port `8000`, `8006`, or `3001` is already occupied, free it with PowerShell:

```powershell
# Free port 8000 (Backend Orchestrator)
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Free port 8006 (AI Detection)
Get-NetTCPConnection -LocalPort 8006 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Free port 3001 (Frontend Website)
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### 2. Frontend Dependencies Installation Issues
If you encounter npm dependency issues on Windows:
```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### 3. Backend Python Missing Dependencies
```powershell
# For Orchestrator:
python -m pip install -r backend-orchestrator/requirements.txt

# For AI Detection:
python -m pip install -r ai-detection/requirements.txt
```

### 4. Running Without Docker
You do **not** need Docker installed to test the website. Running `Option A` (`.\run.ps1`) or `Option B` (Local Terminals) uses local in-memory SQLite and mock connectors to provide a completely functional experience.


