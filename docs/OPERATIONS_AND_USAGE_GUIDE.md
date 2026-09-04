# Gujarat Sentinel — Platform Operations & Usage Guide

**System**: Gujarat Sentinel CCTV Hybrid Surveillance Platform  
**Target Users**: Police Duty Officers, Investigation Specialists, SOC Supervisors, System Administrators  
**Classification**: Official Gujarat Police Operational Documentation  
**Version**: 2.0 (Hardened Baseline, September 2026)  

---

## 1. System Architecture & Port Map

Gujarat Sentinel operates as a unified hybrid surveillance platform comprising:

| Subsystem | Port / Transport | Purpose | Tech Stack |
|---|---|---|---|
| **Central Brain Orchestrator** | `:8000/TCP` | Primary REST API & WebSocket Gateway | Python 3.10+ / FastAPI |
| **AI Computer Vision** | `:8006/TCP` | Real-Time YOLOv8 & EasyOCR Inference | PyTorch 2.5+ / DirectML / CUDA |
| **Frontend Tactical UI** | `:5173/TCP` (dev) / `:80` (prod) | Surveillance Command Dashboard | React 18 / TypeScript / Vite |
| **Media Gateway (MediaMTX)** | `103.250.160.189:8554` (RTSP)<br>`103.250.160.189:8889` (WHEP)<br>`103.250.160.189:8189` (UDP) | 30 Live CCTV Feeds (`cam01` to `cam30`) | MediaMTX v1.9+ |
| **PostgreSQL + PostGIS** | `:5432/TCP` | Persistent Relational Datastore | PostgreSQL 16 + PostGIS |
| **Redis Cache** | `:6379/TCP` | Stream Status & Pub/Sub Alerts | Redis 7.2 |
| **Apache Kafka** | `:9092/TCP` | Asynchronous Event Streaming | Apache Kafka 3.7 |
| **MinIO S3 Evidence** | `:9000/TCP` / `:9001/TCP` | Digital Evidence Vault & Certificates | MinIO S3 Server |

---

## 2. Environment Configuration & Secret Hygiene

> [!IMPORTANT]
> **Stream Credentials Injection**: Live CCTV streams on `103.250.160.189` enforce Basic Authentication. Credentials must **never** be hardcoded or committed. They must be supplied strictly via runtime environment variables:

```bash
# Copy template configuration
cp .env.example .env

# Supply runtime credentials in .env (gitignored)
SENTINEL_STREAM_USER=your_officer_email@example.com
SENTINEL_STREAM_PASSWORD=your_secure_stream_password
```

---

## 3. Startup Procedures

### A. 1-Click Docker Compose
```bash
docker-compose up -d --build
```
Access the web command center at `http://localhost:5173` (or `https://cctv.corp8.cloud` in staging).

### B. Local Development Quickstart
```powershell
# Terminal 1: Backend Orchestrator
cd backend-orchestrator
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: AI Detection Microservice
cd ai-detection
python -m uvicorn app.main:app --host 0.0.0.0 --port 8006

# Terminal 3: Frontend Surveillance UI
cd frontend
npm run dev
```

---

## 4. Default Officer Accounts for System Demonstration

| Officer Name | Badge Number | Assigned Role | Default Password | Permissions Granted |
|---|---|---|---|---|
| **Inspector R.K. Jadeja** | `GJ-POL-8842` | `ADMIN` / `SOC_LEAD` | `Sentinel@2026` | Statewide sovereignty, User Management, Break-Glass, Audit Ledger |
| **Inspector Vikram Solanki** | `POLICE-AHM-042` | `INSPECTOR` | `Sentinel@2026` | Full Investigation Dossier, Case Creation, Section 65B Export |
| **Sub-Inspector P.V. Solanki** | `GJ-POL-4190` | `INVESTIGATOR` | `Sentinel@2026` | 360° Search, Case Dossier Creation, Section 65B Certificate Export |
| **Head Constable A.M. Patel** | `GJ-POL-1044` | `OPERATOR` | `Sentinel@2026` | Live Camera Matrix, Department Views, Alert Acknowledgement |

*(Note: Passwords shown above are default local development passwords for demonstration testing. Production environments link to NIC eGujCop SSO).*

---

## 5. Standard Operating Procedures (SOP) & Officer Workflows

### Workflow 1: Live Command Operations & Video Monitoring (`/live`)
1. Log in and navigate to **Live Operations** in the navigation bar.
2. View the 30-camera matrix showing real-time feeds from Ahmedabad, Surat, Vadodara, Rajkot, and Gandhinagar.
3. Use the department filter tabs (Police, RTO, Forest, Ports) to filter cameras by administrative ownership.
4. Click any camera tile to open the high-resolution inspection modal with PTZ pan/tilt overlay and live snapshot capture.

### Workflow 2: Suspect Vehicle Investigation & 360° Dossier (`/investigate`)
1. Navigate to **Investigation** in the navigation bar.
2. Enter the target vehicle registration number or track identifier (e.g. `UNREADABLE-TRACK-1`) and click **SEARCH**.
3. Review:
   - Chronological sighting timeline with exact UTC capture times and monotonic PTS intervals.
   - GPS locations clustered on the statewide map.
   - Detected vehicle classification (Car, Truck, Bus, Motorcycle).
4. Click **DISPATCH PATROL** to broadcast an immediate APB threat alert to field units.

### Workflow 3: Section 65B Case Dossier Creation (`/cases`)
1. Navigate to **Case Files** in the navigation bar.
2. Click **New Investigation Case** and enter the Case Title, FIR reference, and target plate.
3. The system automatically attaches verified camera sightings and dynamically calculates the **Verified Node Count** (`COUNT(DISTINCT camera_id)`).
4. Click **Export Section 65B Certificate** to download the court-admissible electronic certificate sealed with an unbroken HMAC-SHA256 hash chain.

### Workflow 4: Break-Glass Emergency Privilege Elevation
1. In the header bar, click the red **Break-Glass** emergency button.
2. Enter the mandatory operational justification (e.g. "Immediate pursuit of armed robbery suspect").
3. Full statewide surveillance access is unlocked, a high-visibility warning banner is activated, and an immutable entry is recorded in the Section 65B audit ledger.

---

## 6. Troubleshooting & Diagnostics

| Symptom | Diagnostic Step | Resolution |
|---|---|---|
| **Camera shows `OFFLINE`** | Run `GET /api/v1/streams/{id}/status` | Verify MediaMTX TCP port 8554 is reachable; check upstream camera RTSP feed. |
| **Camera shows `AUTH_ERROR`** | Inspect server logs for HTTP 401 | Verify `SENTINEL_STREAM_USER` and `SENTINEL_STREAM_PASSWORD` in `.env`. |
| **WebRTC player black screen on H.265 cameras** | Check camera codec in status API | Cameras `cam06`, `cam12`, `cam17`, `cam18`, `cam22`, `cam26` stream in H.265. Use Snapshot HUD mode (`/snapshot`). |
| **Database shows `DEGRADED`** | Run `GET /health` | PostgreSQL port 5432 is down; system is operating on local SQLite fallback (`sentinel_platform.db`). |
