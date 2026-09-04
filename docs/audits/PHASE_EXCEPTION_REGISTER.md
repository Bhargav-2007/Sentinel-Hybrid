# Phase Exception Register

**Audit Date**: 2026-09-04T15:23:10+05:30  
**Status**: Authoritative Production Hardening Governance  

---

## Controlled Exception Register

| Exception ID | Phase | Trigger Condition | Technical Reason | Affected Capability | Allowed Continuation | Required Documentation | Resolution / Mitigation | Authoritative Status |
|---|---|---|---|---|---|---|---|---|
| **EX-001** | Phase 05 | Direct raw WHEP SDP offer without ICE STUN gathering | WebRTC requires bidirectional ICE negotiation; MediaMTX WHEP endpoint requires valid SRTP candidate pairing | Direct client-side raw HTTP POST to gateway `:8889` | Allowed via `backend-orchestrator` WHEP proxy or standard browser WebRTC API | Documented in `PHASE_05_MEDIA_PIPELINE_VERIFICATION.md` | Proxy endpoint `/api/v1/streams/{id}/whep` abstracts handshake for web clients | **PERMANENT ARCHITECTURE** |
| **EX-002** | Phase 05 | 6 cameras stream in H.265 (HEVC) | Standard WebRTC browsers (Chrome/Firefox) do not support native hardware HEVC WebRTC decoding without experimental flags | Native WebRTC browser playback on `cam06`, `cam12`, `cam17`, `cam18`, `cam22`, `cam26` | AI RTSP backend ingestion is 100% functional; browser displays via Snapshot HUD (`/snapshot`) | Documented in `MEDIA_PLANE.md` | Server-side FFmpeg transcoding to H.264 or periodic JPEG snapshot HUD stream | **KNOWN LIMITATION / MITIGATED** |
| **EX-003** | Phase 06 | Ambiguous "Hardware PTS" claim | `cv2.CAP_PROP_POS_MSEC` reflects decoder presentation time in milliseconds, not atomic/hardware camera clock | Judicial timebase claims | System may use `pos_msec` for relative speed and frame delta; UTC timestamps must come from server clock | Documented in `TIME_AND_TIMESTAMP_MODEL.md` | Relabeled as Decoded Presentation Timestamp; Section 65B uses NTP server time | **RESOLVED IN MODEL** |
| **EX-004** | Phase 13 | No vehicle transited between multiple active cameras during audit | Checkpoints are separated by multiple kilometers; traffic flow during audit window yielded no multi-camera re-identifications | Live cross-camera vehicle re-identification verification | Camera-local tracking and single-camera AI verification remain 100% valid | Documented in `PHASE_13_CROSS_CAMERA_CORRELATION_PROOF.md` | Capability classified as `IMPLEMENTED + NOT VERIFIED IN LIVE RE-ID` per Phase Rule 10 | **TRUTHFUL VERIFICATION** |
| **EX-005** | Phase 14 | Single GPU cannot process 30 streams @ 25 FPS ($750\text{ FPS}$) | Hardware tensor core throughput limits serial YOLOv8 inference to $\approx 22.5\text{ FPS}$ per node | Full concurrent 25 FPS AI inference across all 30 streams simultaneously on single node | Measured capacity (12–15 streams at 2 FPS sampling) verified; multi-stream batching allowed | Documented in `PHASE_15_PERFORMANCE_REPORT.md` | Horizontal scaling via Kubernetes worker pods or edge decimation (2 FPS sampling) | **KNOWN HARDWARE BOUND** |

---

## Acceptance Criteria Verification

- [x] Every exception assigned an explicit identifier (`EX-001` to `EX-005`).
- [x] Mitigation and allowed continuation documented without bypassing safety.
- [x] Zero unrecorded exceptions.

**Status: PASS**
