# Gujarat Sentinel — Live CCTV Operations & Ingestion Runbook

**Audience**: DevOps Engineers, System Administrators, Police SOC Network Engineers  
**Target Infrastructure**: Gujarat Police Live CCTV Media Gateway (`103.250.160.189`)  
**Version**: 2.0  
**Last Updated**: September 2026  

---

## 1. Stream Topology & Network Architecture

The platform connects to 30 continuous CCTV streams (`cam01` through `cam30`) hosted on an enterprise MediaMTX streaming server.

```
                    [ 30 Gujarat CCTV Feeds ]
                               │
                      (RTSP H.264 Ingestion)
                               ▼
        ┌──────────────────────────────────────────────┐
        │  MediaMTX Gateway (103.250.160.189)          │
        │  ├── Port 8554 (TCP): RTSP Ingress/Egress    │
        │  ├── Port 8889 (TCP): WebRTC WHEP Endpoint   │
        │  ├── Port 8189 (UDP): ICE/STUN Media Relay   │
        │  └── Port 80/443: HLS H.264 Transport Segments│
        └──────────────────────┬───────────────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             │ Basic Auth Protected Relay        │
             ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ AI Detection Service    │         │ Backend Orchestrator    │
│ (:8002 / :8006)         │         │ (:8000)                 │
│ ├── OpenCV RTSP Capture │         │ ├── WHEP Reverse Proxy  │
│ ├── YOLOv8 Vehicle Det  │         │ ├── Snapshot PTS Inject │
│ └── PaddleOCR HSRP      │         │ └── HLS Master Playlist │
└─────────────────────────┘         └────────────┬────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │ Frontend Client SPA     │
                                    │ (:5173 / :80)           │
                                    │ ├── WebRTC WHEP Player  │
                                    │ └── HLS / MJPEG Fallback│
                                    └─────────────────────────┘
```

---

## 2. Ingestion Protocols & Port Map

| Protocol | Destination Host & Port | Usage / Purpose | Typical Latency |
|---|---|---|---|
| **RTSP** | `103.250.160.189:8554` | AI Detection frame capture & backend snapshot generator | < 150 ms |
| **WebRTC WHEP** | `103.250.160.189:8889` | Sub-second live browser video delivery (primary) | 180–350 ms |
| **ICE / STUN** | `103.250.160.189:8189` (UDP) | WebRTC NAT traversal and UDP RTP packet streaming | N/A |
| **HLS (m3u8)** | `cctv.corp8.cloud` (:443) | Cellular/patrol car fallback streaming | 3–5 seconds |

---

## 3. Authentication & Secret Management

The MediaMTX server on `103.250.160.189` enforces HTTP Basic Authentication realm challenge (`Basic realm="mediamtx"`).

### Environment Configuration
Never hardcode credentials in code or commit `.env` to git repository. Set environment variables on the backend server:

```bash
# In backend-orchestrator/.env
SENTINEL_STREAM_USER=alice
SENTINEL_STREAM_PASSWORD=secure_password_here
SENTINEL_STREAM_HOST=103.250.160.189
SENTINEL_STREAM_RTSP_PORT=8554
SENTINEL_STREAM_WHEP_PORT=8889
```

### URL Encoding Safety
If the username contains an `@` symbol (e.g. `alice@example.com`), `settings.get_authenticated_rtsp_url(cam_tag)` automatically URL-encodes it to `alice%40example.com` to prevent URI parsing syntax errors.

---

## 4. Operational Procedures & Troubleshooting

### Scenario A: Stream Returns 401 Unauthorized in Browser
- **Cause**: Browser tried connecting directly to `103.250.160.189:8889` without credentials.
- **Solution**: The frontend video player connects to the backend proxy:
  `POST /api/v1/streams/{cam_tag}/whep`
  The backend injects server credentials and forwards the SDP offer to MediaMTX.

### Scenario B: WebRTC ICE Connection State is "Failed" or "Disconnected"
- **Cause**: UDP Port `8189` blocked by local enterprise firewall or NAT traversal issue.
- **Remedy**:
  1. Verify UDP port 8189 is open outbound.
  2. The `VideoPlayer.tsx` automatically switches to low-latency HLS (`stream.m3u8`) or HTTP snapshot mode with continuous PTS updates.

### Scenario C: PTS Frame Timestamp Inconsistencies
- **Cause**: Camera hardware clock drift.
- **Remedy**: The backend uses monotonic PTS extraction:
  `pts_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC))` with fallback to `int(time.monotonic() * 1000)`.
  The value is returned in header `X-Sentinel-PTS-MS` for tamper-proof velocity computation.

---

## 5. Verification Script

To test all 30 streams from the command line:

```python
import httpx

for i in range(1, 31):
    tag = f"cam{i:02d}"
    url = f"http://103.250.160.189:8889/stream/{tag}/whep"
    res = httpx.post(url, timeout=5.0)
    print(f"{tag}: status {res.status_code}")
```
Expected output: All 30 streams return HTTP 401 (MediaMTX server active).
