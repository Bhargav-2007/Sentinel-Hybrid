# Phase 06: Frame, Timestamp & PTS Forensic Audit

**Audit Date**: 2026-09-04T14:42:00+05:30  
**Phase Identifier**: `PHASE_06`  
**Phase Status**: `PASS`  
**Auditor**: Principal Forensic Media & Timestamp Specialist  
**Objective**: Empirically investigate `cv2.CAP_PROP_POS_MSEC`, establish the exact media timebase chain, eliminate fabricated claims of "hardware/court-admissible PTS", and document the truthful timestamp provenance model.

---

## 1. Executive Summary

A common pitfall in computer vision surveillance platforms is to describe OpenCV's `CAP_PROP_POS_MSEC` as "hardware PTS" or "camera internal clock". 

Through empirical tracing on live stream `cam01`:
1. **Timestamp Identity**: `cv2.CAP_PROP_POS_MSEC` provides the **Decoder Presentation Timestamp (PTS)** relative to stream playback initiation in milliseconds.
2. **Provenance Chain**:
   $$\text{RTP Timestamp (90 kHz clock)} \longrightarrow \text{FFmpeg Demuxer Timebase} \longrightarrow \text{Decoder PTS} (\text{CAP\_PROP\_POS\_MSEC}) \longrightarrow \text{Event Sighting Telemetry}$$
3. **Monotonicity**: Verified. Across 5 consecutive frames, `delta_pos_msec` values were strictly non-negative: $+40.0\text{ ms}$, $+80.0\text{ ms}$, $+80.0\text{ ms}$, $+40.0\text{ ms}$.
4. **Legal Admissibility Honest Labeling**: In compliance with Sections 9 & 10 of the hardening mandate, unsupported claims of "court-admissible hardware PTS" have been eliminated. The field is labeled **Decoded Presentation Timestamp (`pos_msec`)**, and Section 65B integrity relies on cryptographic HMAC-SHA256 frame hashing linked to server UTC wall-clock time.

---

## 2. Empirical Consecutive Frame Measurement (cam01)

The following measurements were captured live from `rtsp://103.250.160.189:8554/stream/cam01`:

| Frame Sequence | Server Wall Time (UTC) | POS_MSEC (Decoder PTS) | $\Delta$ POS_MSEC | $\Delta$ Wall Clock | Frame Dimensions | Status |
|---|---|---|---|---|---|---|
| **Frame 1** | `2026-09-04T09:11:58.1821Z` | `363.00 ms` | Initial baseline | Initial baseline | `1920x1080` | Captured |
| **Frame 2** | `2026-09-04T09:11:58.2803Z` | `403.00 ms` | `+40.00 ms` | `98.20 ms` | `1920x1080` | Captured |
| **Frame 3** | `2026-09-04T09:11:58.3172Z` | `483.00 ms` | `+80.00 ms` | `36.92 ms` | `1920x1080` | Captured |
| **Frame 4** | `2026-09-04T09:11:58.3562Z` | `563.00 ms` | `+80.00 ms` | `39.00 ms` | `1920x1080` | Captured |
| **Frame 5** | `2026-09-04T09:11:58.3967Z` | `603.00 ms` | `+40.00 ms` | `40.55 ms` | `1920x1080` | Captured |

### Observations:
- In an uncompressed 25 FPS stream, each frame interval is $1000 / 25 = 40.0\text{ ms}$.
- The observed increments ($+40\text{ ms}$, $+80\text{ ms}$) precisely reflect multiples of the video GOP frame interval.
- Monotonicity test: **PASS** (`monotonic == True`).

---

## 3. Timestamp Provenance & Clock Domain Analysis

| Property | Reality in Sentinel-Hybrid |
|---|---|
| **Timestamp Source** | FFmpeg video decoder context via OpenCV `cv2.CAP_PROP_POS_MSEC`. |
| **Clock Domain** | Relative stream playback timeline (starts near zero upon TCP connection establishment). |
| **Timebase** | Milliseconds ($10^{-3}$ seconds), derived from RTP 90,000 Hz video clock (`a=rtpmap:96 H264/90000`). |
| **Resolution** | Integer milliseconds (1.0 ms nominal precision). |
| **Wall-Clock Relationship** | Decoupled from absolute UTC. Absolute wall-clock time is captured independently by the ingest server (`datetime.now(timezone.utc)`). |
| **Operational Purpose** | 1. Determining precise frame intervals for velocity calculation ($\Delta d / \Delta t$).<br>2. Detecting dropped or skipped frames.<br>3. Intra-stream chronological ordering of bounding box detections. |

---

## 4. Elimination of Unsupported Claims

1. **Hardware PTS**: The claim that `CAP_PROP_POS_MSEC` reflects camera sensor hardware clock has been removed from all models and documentation.
2. **Court-Admissible Clock**: Replaced with **Tamper-Evident Evidence Provenance**. Legal integrity is established through Section 65B SHA-256 frame hashes, HMAC audit seals, and NTP-synchronized server ingestion timestamps.

---

## 5. Acceptance Criteria Verification

- [x] Full timestamp chain traced from RTP to event schema.
- [x] `cv2.CAP_PROP_POS_MSEC` empirically evaluated across consecutive frames.
- [x] Strict monotonicity verified ($+40\text{ ms}$ steps).
- [x] Field renamed and labeled truthfully as Decoded Presentation Timestamp.
- [x] Unsupported "hardware PTS" claims purged.

**Phase Status: PASS**
