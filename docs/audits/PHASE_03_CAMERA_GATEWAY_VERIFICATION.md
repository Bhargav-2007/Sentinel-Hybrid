# Phase 03: Live CCTV Network, Auth & Media Gateway Verification

**Audit Date**: 2026-09-04T14:38:50+05:30  
**Phase Identifier**: `PHASE_03`  
**Phase Status**: `PASS`  
**Gateway Host**: `103.250.160.189`  
**Ports Probed**: `8554/TCP` (RTSP), `8889/TCP` (WHEP), `8189/UDP` (WebRTC)  
**Authentication**: Basic Auth via runtime environment variables (`SENTINEL_STREAM_USER`, `SENTINEL_STREAM_PASSWORD`)  
**Objective**: Prove network reachability, credential acceptance, RTSP session negotiation, and media descriptor validity across the entire 30-camera live fleet without fabricating success.

---

## 1. Executive Summary

An empirical socket-level and HTTP-level probe was executed against all 30 live streams (`cam01` through `cam30`) hosted on MediaMTX at `103.250.160.189`.

- **Network Reachability**: **30/30 (100%)** cameras reachable on TCP port 8554 and port 8889.
- **Authentication**: **30/30 (100%)** cameras successfully authenticated via runtime credentials, returning `RTSP/1.0 200 OK`. (Zero `401 Unauthorized` responses).
- **RTSP Media Session**: **30/30 (100%)** cameras returned valid SDP session descriptors containing active `m=video` tracks.
- **Codec Distribution**:
  - **24 Cameras** streaming in `H264/90000`
  - **6 Cameras** streaming in `H265/90000` (HEVC) (`cam06`, `cam12`, `cam17`, `cam18`, `cam22`, `cam26`)
- **WHEP Options Response**: **30/30 (100%)** returned HTTP `204 No Content` acknowledging WebRTC WHEP endpoint availability.

---

## 2. Gateway Infrastructure & Protocol Matrix

| Protocol | Gateway Port | Transport | Purpose | Measured Result |
|---|---|---|---|---|
| **RTSP** | `:8554` | TCP | Real-time video ingestion for OpenCV / AI inference | `30/30 RTSP 200 OK` with valid SDP video track |
| **WHEP** | `:8889` | HTTP/TCP | Sub-second WebRTC streaming to browsers | `30/30 OPTIONS 204 OK` |
| **WebRTC Media** | `:8189` | UDP | RTP/SRTP ICE candidate negotiation | Configured & listening on gateway |
| **HLS** | `:8888` / `:443` | HTTPS | Segmented HTTP Live Streaming fallback | Configured via `cctv.corp8.cloud` CDN |

---

## 3. Detailed 30-Camera Gateway Audit Table

| Camera | Network | Basic Auth | RTSP Session | Media Track | Codec Observed | Upstream Stream Name | Status Classification |
|---|---|---|---|---|---|---|---|
| `cam01` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Chiman bhai Bridge CSITMS-32_PTZ2 | `MEDIA_ACTIVE` |
| `cam02` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Janpath T CSITMS-10_PTZ2 | `MEDIA_ACTIVE` |
| `cam03` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | O.N.G.C. Office BS-103_B1 | `MEDIA_ACTIVE` |
| `cam04` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Paldi Circle CSITMS-07_PTZ1 | `MEDIA_ACTIVE` |
| `cam05` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Visat teen Rasta CSITMS-31_PTZ1 | `MEDIA_ACTIVE` |
| `cam06` | PASS | PASS | RTSP 200 OK | `m=video` active | `H265/90000` | Soni ni chal CSITMS-04_PTZ1 | `MEDIA_ACTIVE` |
| `cam07` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Swastik Cross Road CSITMS-19_PTZ1 | `MEDIA_ACTIVE` |
| `cam08` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Commerce Six Road CSITMS-22_PTZ1 | `MEDIA_ACTIVE` |
| `cam09` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Ishwar Bhuvan CSITMS-21_PTZ1 | `MEDIA_ACTIVE` |
| `cam10` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Mansi Cross Road CSITMS-27_PTZ1 | `MEDIA_ACTIVE` |
| `cam11` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Sardar Patel Statue CSITMS-20_PTZ1 | `MEDIA_ACTIVE` |
| `cam12` | PASS | PASS | RTSP 200 OK | `m=video` active | `H265/90000` | Thaltej Cross Road CSITMS-25_PTZ1 | `MEDIA_ACTIVE` |
| `cam13` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Helmet Cross Road CSITMS-24_PTZ1 | `MEDIA_ACTIVE` |
| `cam14` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Subhash Bridge CSITMS-30_PTZ1 | `MEDIA_ACTIVE` |
| `cam15` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Income Tax CSITMS-12_PTZ1 | `MEDIA_ACTIVE` |
| `cam16` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Vadaj Circle CSITMS-29_PTZ1 | `MEDIA_ACTIVE` |
| `cam17` | PASS | PASS | RTSP 200 OK | `m=video` active | `H265/90000` | Danilimda Cross Road CSITMS-02_PTZ1 | `MEDIA_ACTIVE` |
| `cam18` | PASS | PASS | RTSP 200 OK | `m=video` active | `H265/90000` | Geeta Mandir CSITMS-05_PTZ1 | `MEDIA_ACTIVE` |
| `cam19` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | CTM Cross Road CSITMS-01_PTZ1 | `MEDIA_ACTIVE` |
| `cam20` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Narol Circle CSITMS-03_PTZ1 | `MEDIA_ACTIVE` |
| `cam21` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Isanpur Cross Road CSITMS-06_PTZ1 | `MEDIA_ACTIVE` |
| `cam22` | PASS | PASS | RTSP 200 OK | `m=video` active | `H265/90000` | Anjali Cross Road CSITMS-08_PTZ1 | `MEDIA_ACTIVE` |
| `cam23` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Nehrunagar CSITMS-09_PTZ1 | `MEDIA_ACTIVE` |
| `cam24` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Shivranjani CSITMS-26_PTZ1 | `MEDIA_ACTIVE` |
| `cam25` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Shyamal Cross Road CSITMS-28_PTZ1 | `MEDIA_ACTIVE` |
| `cam26` | PASS | PASS | RTSP 200 OK | `m=video` active | `H265/90000` | Jivraj Park CSITMS-11_PTZ1 | `MEDIA_ACTIVE` |
| `cam27` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Usmanpura CSITMS-13_PTZ1 | `MEDIA_ACTIVE` |
| `cam28` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Naranpura CSITMS-14_PTZ1 | `MEDIA_ACTIVE` |
| `cam29` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | Akhbarnagar CSITMS-15_PTZ1 | `MEDIA_ACTIVE` |
| `cam30` | PASS | PASS | RTSP 200 OK | `m=video` active | `H264/90000` | RTO Circle CSITMS-16_PTZ1 | `MEDIA_ACTIVE` |

---

## 4. Acceptance Criteria Verification

- [x] 30/30 Network reachability status known and verified (`30/30 PASS`).
- [x] 30/30 Authentication status known and verified (`30/30 PASS`).
- [x] 30/30 Media active status verified (`30/30 MEDIA_ACTIVE`).
- [x] Exact video codecs empirically observed (24 H.264, 6 H.265).
- [x] No credentials logged or recorded.

**Phase Status: PASS**
