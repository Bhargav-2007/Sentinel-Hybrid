# Gujarat Sentinel — Platform Operations & Officer Usage Guide

**System**: Gujarat Sentinel CCTV Hybrid Surveillance Platform  
**Target Users**: Police Duty Officers, Investigation Specialists, SOC Supervisors, System Administrators  
**Classification**: Official Gujarat Police Operational Documentation  
**Version**: 2.0 (September 2026)  

---

## 1. System Architecture & Startup Quickstart

Gujarat Sentinel operates as a unified hybrid surveillance platform comprising:
- **Central Brain Orchestrator** (FastAPI, Python 3.11, Port `:8000`)
- **AI Computer Vision & ANPR Microservice** (YOLOv8 + PaddleOCR, Port `:8002` / `:8006`)
- **Frontend Tactical Command Center** (React 18 + Vite, Port `:5173`)
- **MediaMTX CCTV Gateway** (`103.250.160.189`, Ports 8554 RTSP, 8889 WHEP, 8189 UDP)

### A. 1-Click Startup via Docker Compose
```bash
docker-compose up -d --build
```
Access the web command center at `http://localhost:5173` (or `https://cctv.corp8.cloud` in production).

### B. Local Development Startup
```bash
# Terminal 1: Backend Orchestrator
cd backend-orchestrator
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: AI Computer Vision & ANPR
cd ai-detection
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 3: Frontend Dashboard
cd frontend
npm install && npm run dev
```

---

## 2. Default Officer Accounts for Evaluation

| Officer Name | Badge Number | Role | Default Password | Permissions Granted |
|---|---|---|---|---|
| **Inspector R.K. Jadeja** | `GJ-POL-8842` | `ADMIN` / `SOC_LEAD` | `Sentinel@2026` | Statewide sovereignty, User Management, Break-Glass, Audit Ledger |
| **Sub-Inspector P.V. Solanki** | `GJ-POL-4190` | `INVESTIGATOR` | `Sentinel@2026` | 360° Search, Case Dossier Creation, Section 65B Certificate Export |
| **Head Constable A.M. Patel** | `GJ-POL-1044` | `OPERATOR` | `Sentinel@2026` | Live Camera Matrix, Department Views, Alert Acknowledgement |

*(Note: Synthetic evaluation credentials comply with Section 8 of the challenge specifications; production environments link to NIC eGujCop SSO).*

---

## 3. Standard Operating Procedures (SOP) & Workflows

### Workflow 1: Live Command Operations & Video Monitoring (`/live`)
1. Log into the system and navigate to **Live Command** in the sidebar.
2. View the 30-camera matrix showing real-time feeds from Ahmedabad, Surat, Vadodara, Rajkot, and Gandhinagar.
3. Use the department tabs (Home Police, GSRTC Transport, Municipal Corporation, Health & Family Welfare, Panchayat & Rural) to isolate specific departmental camera grids.
4. Double-click any camera tile to open the full-screen inspection modal with real-time PTS presentation millisecond counters.

### Workflow 2: Suspect Vehicle Investigation & 360° Dossier (`/investigate`)
1. Click **Investigation** in the sidebar.
2. Enter the target vehicle registration number (e.g. `GJ01AB1234`) and click **SEARCH VEHICLE**.
3. Review:
   - Vehicle registration details (VAHAN 4.0 data)
   - eGujCop crime registry status (Stolen / Wanted / Clean)
   - Sequential chronological camera sightings across Gujarat highway corridors
   - Bayesian cross-camera correlation score and spatial travel plausibility
4. If a cloned plate is detected (impossible travel speed > 160 km/h or simultaneous sightings at two distant locations), the system automatically flags a **CRITICAL: CLONED PLATE ALERT**.

### Workflow 3: Section 65B Case Evidence Dossier Creation (`/cases`)
1. Navigate to **Case Files** in the sidebar.
2. The system auto-generates a sequential Case Number (`CASE-2026-00129`) and FIR reference.
3. Click **CHECK ALL CAMERAS FOR TARGET** or use **Pick Camera Node** to record verified sightings.
4. Verify that the **Node(s) Verified** counter reflects the exact unique camera checkpoints visited.
5. Review the dynamically calculated SHA-256 Digest and HMAC-SHA256 digital signature.
6. Click **Save Case Dossier** to persist the record in the SQLite/PostgreSQL database.
7. Click **PRINT / EXPORT 65B DOSSIER** to generate the court-ready legal certificate under Section 65B of the Indian Evidence Act.

### Workflow 4: Threat Alert Triage & Automated Dispatch (`/alerts`)
1. Navigate to **Threat Alerts**.
2. Alerts are categorized into CRITICAL, HIGH, MEDIUM, LOW based on the multi-signal threat scoring engine (0–100).
3. Click **AUTO-DISPATCH PCR** on a critical alert:
   - Interception coordinates are transmitted to the nearest patrol unit.
   - An immutable Section 65B audit record is automatically logged in the audit trail.

### Workflow 5: Break-Glass Emergency Authorization
1. In the top navigation bar, click the **Break-Glass** emergency button.
2. Enter the justification reason (e.g. "Immediate Pursuit of Kidnapping Suspect Vehicle on SG Highway").
3. Once activated:
   - Full statewide surveillance privileges are unlocked.
   - A high-visibility banner activates across all operator screens.
   - SMS and email notifications are simulated to the SOC Lead.
   - All actions performed during the session are tagged with forensic audit flags.

### Workflow 6: Forensic Audit Ledger (`/audit`)
1. Click **Section 65B Audit** in the sidebar.
2. Inspect the chronological ledger of all privileged actions (logins, break-glass activations, case creations, deletions, auto-dispatches).
3. Filter by action type or search by officer badge number.
4. Click the copy icon next to any HMAC-SHA256 signature to copy the forensic hash for judicial proceedings.
