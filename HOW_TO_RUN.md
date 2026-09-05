# Gujarat Sentinel — How to Run the Website & Officer Services

This guide provides the official instructions for running the **Gujarat Sentinel Hybrid Surveillance Platform** on **Windows**, Linux, and macOS.

---

## ⚡ Quick Start: One Command on Windows

Open **PowerShell as Administrator** or standard PowerShell in the project root (`C:\Users\BHARGAV\Desktop\Sentinel-Hybrid`):

```powershell
.\run.ps1
```

This launches the interactive **Windows Control Center**:

```text
============================================================
  GUJARAT SENTINEL — WINDOWS CONTROL CENTER
============================================================
  [1] Start Core Officer Path (Recommended: M1, M2, AI, Brain, UI)
  [2] Start Full Stack (All Models & Docker Infra)
  [3] Clean & Free Occupied Ports (8000-8006, 3001, Docker)
  [4] Run Diagnostics (Doctor)
  [5] Run End-to-End Smoke Verification
  [6] Stop Application Services
  [7] Stop All (Apps + Docker Containers)
  [0] Exit
============================================================
👉 Enter selection [0-7, Default: 1]:
```

Press **Enter** (or type `1`) to launch the **Core Officer Path**.

### What Starts Automatically:
1. **Clean Ports Engine**: Scans and frees ports `3001`, `8000`, `8001`, `8002`, `8005`, `8006` from any previous lingering runs.
2. **Model 1 (CCTV Registry + GIS)** on `http://localhost:8001`
3. **AI Detection Engine (YOLOv8 + ByteTrack)** on `http://localhost:8006`
4. **Model 2 (Unified Video Viewing & ANPR)** on `http://localhost:8002`
5. **Central Brain Orchestrator & Section 65B Evidence** on `http://localhost:8005`
6. **Hybrid API Gateway & Reverse Proxy** on `http://localhost:8000` (runs Python fallback proxy if Go is not installed)
7. **Police Command Center UI** on `http://localhost:3001`

When startup completes, you can open your browser immediately:
👉 **[http://localhost:3001](http://localhost:3001)**

---

## 💻 CLI Commands (Python Direct)

If you prefer using the Python CLI directly:

```powershell
# 1. Free any occupied ports from previous runs:
python scripts/run.py --clean-ports

# 2. Check your system dependencies:
python scripts/run.py --doctor

# 3. Start the Core Officer Path:
python scripts/run.py --core-start

# 4. Verify all endpoints:
python scripts/run.py --verify

# 5. Check live health status table:
python scripts/run.py --status

# 6. Stop all applications:
python scripts/run.py --stop-apps
```

---

## 🛠️ Toolchain & Environment Matrix

The Sentinel platform is designed to **never crash** even if optional developer toolchains or Docker Desktop are offline on Windows:

| Subsystem | Port | Technology | Required on Windows? | Fallback Behavior |
|---|---|---|:---:|---|
| **Police Command Center UI** | `:3001` | React 18 + Vite + TS | **YES** (Node.js & npm) | Native dev server with instant HMR |
| **Model 1 (Registry & GIS)** | `:8001` | Python 3.11 + FastAPI | **YES** (Python) | SQLite spatial fallback when Postgres is offline |
| **Model 2 (Unified Viewer & ANPR)** | `:8002` | Python 3.11 + FastAPI | **YES** (Python) | OpenCV fallback when PyAV is absent, local storage |
| **AI Detection Microservice** | `:8006` | PyTorch + YOLOv8 | **YES** (Python) | High-speed CPU inference when CUDA kernels uncompiled |
| **Platform Orchestrator & 65B** | `:8005` | Python 3.11 + FastAPI | **YES** (Python) | Standalone correlation engine & Section 65B signer |
| **Hybrid API Gateway** | `:8000` | Go / Python Proxy | **NO** (Go optional) | Automatically runs Python fallback gateway if Go absent |
| **Model 3 (VMS Federation SDK)** | `:8003` | Java 17 + Spring Boot | **NO** (Java/Maven optional) | Gracefully skipped with notice if `mvn` not installed |
| **Model 4 (Trajectory Hub)** | `:8004` | Go 1.22 | **NO** (Go optional) | Gracefully skipped with notice if `go` not installed |
| **Docker Infrastructure** | Various | PostgreSQL, Redis, Kafka, etc. | **NO** (Docker optional) | Platform runs in Standalone Core Mode if Docker offline |

---

## 👮 Police Officer Demo Login Credentials

When the website opens at **[http://localhost:3001](http://localhost:3001)**:

* **Officer Badge ID**: `POLICE-AHM-042`
* **Password**: `Sentinel@2026`
* **Clearance**: `SUPERVISOR` / `ADMIN` (Full operational clearance)
* *(Or click "Bypass / Dev Login" to enter immediately)*

---

## 🎯 Key Screens & Police Officer Workflows

Once logged into the tactical command center:

1. **Live Video Wall (`/live`)**:
   - Multi-department CCTV feeds across Gujarat (Police, GSRTC, Municipal, Panchayat, Health).
   - Switch between 2x2, 3x3, and 4x4 views; inspect live RTSP/WHEP/HLS stream stats.

2. **CCTV Camera Registry (`/cameras`)**:
   - Filter by department (Gujarat Police, GSRTC Transport, Municipal Corporations, Health, Panchayat).
   - Search by camera ID, address, and live connectivity status.

3. **Threat Alerts & APBs (`/alerts`)**:
   - Real-time priority hotlist alerts with vehicle plate detections.
   - Filter by severity (CRITICAL, HIGH, ACKNOWLEDGED).

4. **360° Plate Search & Vehicle Trajectory (`/investigate`)**:
   - Search license plates (e.g. `GJ01AA0001` or `GJ01AB1234`).
   - Inspect VAHAN 4.0 registration data, eGujCop hotlist status, and multi-camera sighting timeline.

5. **Section 65B Court Evidence (`/evidence`)**:
   - Export court-admissible forensic certificates signed with SHA-256 HMAC under the Indian Evidence Act.

6. **Statewide Telemetry & 80k Scalability (`/analytics`)**:
   - Interactive model showing 99.95% WAN bandwidth savings across 80,000 cameras.

---

## ⚠️ Troubleshooting & Solutions

### 1. Port Conflicts (13 Ports Occupied)
If ports `3001`, `8000–8006`, `5432`, `6379`, `9000`, `9200`, or `29092` are held from earlier runs or dangling Docker WSL processes:
```powershell
.\run.ps1
# Choose option [3] Clean & Free Occupied Ports
```
Or directly:
```powershell
python scripts/run.py --clean-ports
```
This terminates orphaned Docker backend relays (`com.docker.backend.exe`, `wslrelay.exe`) and freeing all 13 ports in <1 second.

### 2. Docker Desktop 500 / Unstable Error
If Docker Desktop gives `500 Internal Server Error for API route ... dockerDesktopLinuxEngine/_ping`:
- You do **NOT** need to restart or reinstall Docker.
- Gujarat Sentinel automatically detects when Docker is unresponsive and switches to **Standalone Core Mode** using local SQLite stores and direct inter-service HTTP communication.

### 3. NVIDIA RTX 5050 Laptop GPU (CUDA Architecture)
If PyTorch reports `CUDA error: no kernel image is available for execution on the device`:
- Sentinel automatically catches this and falls back to optimized CPU inference, allowing YOLOv8 vehicle and license plate recognition to execute smoothly without crashing.

### 4. Stopping the Running Services
In the terminal where `.\run.ps1` or `python scripts/run.py --core-start` is running:
- Press **Ctrl+C**. The runner will catch the signal, gracefully stop all background processes, clean up all ports, and exit cleanly.
- Or from another PowerShell window: `python scripts/run.py --stop-apps`.
