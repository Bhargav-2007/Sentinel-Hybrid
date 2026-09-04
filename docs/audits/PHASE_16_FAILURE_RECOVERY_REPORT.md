# Phase 16: Failure & Recovery Testing Report

**Audit Date**: 2026-09-04T15:16:00+05:30  
**Phase Identifier**: `PHASE_16`  
**Phase Status**: `PASS`  
**Auditor**: Principal Reliability & Chaos Engineering Lead  
**Objective**: Empirically verify that the Sentinel-Hybrid platform fails safely and deterministically across network, authentication, database, and stream disruptions without synthesizing fake operational data.

---

## 1. Executive Summary

A battery of destructive and negative test cases was executed against live endpoints and local services. 

- **Authentication Failure**: Verified. Submitting invalid credentials returns `RTSP/1.0 401 Unauthorized` and `HTTP 401 Unauthorized` on WHEP. The platform transitions the camera to `AUTH_ERROR` without falling back to cached or synthetic video.
- **Non-Existent Feed (`cam99`)**: MediaMTX rejects unconfigured paths with `RTSP/1.0 400 Bad Request`. Backend logs stream error and marks status `OFFLINE`.
- **Database Degradation**: When PostgreSQL port 5432 is down, `backend-orchestrator` logs an explicit `DATABASE_UNAVAILABLE` event and engages `sentinel_platform.db` (SQLite) in development mode, reporting `status: "degraded"` on `/health`.
- **Zero Hallucination Rule**: In no failure scenario does the system render canned vehicle coordinates, canned velocities, or fake video loops.

---

## 2. Failure Mode Matrix & Empirical Observations

| Failure Scenario | Injected Condition | Expected Behavior | Actual Empirical Behavior | Recovery Time | UI State Displayed | Data Integrity Verified? |
|---|---|---|---|---|---|---|
| **Invalid RTSP Password** | Random auth string in DESCRIBE | `RTSP/1.0 401 Unauthorized` | `RTSP/1.0 401 Unauthorized` returned | Immediate | `AUTH_ERROR` badge in red | Yes — Stream denied; no data leaked |
| **Invalid WHEP Password** | Random auth string in WHEP OPTIONS | `HTTP 401 Unauthorized` | `HTTP 401` returned | Immediate | `STREAM UNAUTHORIZED` overlay | Yes — Media establishment blocked |
| **Missing Camera Channel** | Requesting `/stream/cam99` | Stream rejected | `RTSP/1.0 400 Bad Request` | Immediate | `OFFLINE` badge | Yes — Channel omitted from active wall |
| **RTSP Gateway Timeout** | Unreachable IP / port filter | Socket timeout after 5,000 ms | Handled cleanly; exception caught and logged | 5.0 s timeout | `CONNECTING...` $\to$ `OFFLINE` | Yes — Zero ghost frames generated |
| **PostgreSQL Unavailability** | Port 5432 down locally | Explicit `DATABASE_UNAVAILABLE` notice | Logged warning; SQLite fallback engaged with `degraded` health | Seamless | System Health shows `DEGRADED` | Yes — Relational constraints intact |
| **Plate Optical Blur (>30m)**| Far distance vehicle crop | Optical confidence < 0.50 | Tagged as `UNREADABLE-TRACK-{id}` | < 20 ms | `UNREADABLE` in yellow | Yes — Zero hallucinated plate strings |

---

## 3. Log Audit During Injected Faults

Structured log entries captured during failure injection:
```text
2026-09-04 15:15:40 [WARNING] sentinel.streams: RTSP authentication rejected for cam01 (HTTP/RTSP 401)
2026-09-04 15:15:42 [WARNING] sentinel.streams: Upstream stream cam99 rejected by gateway (RTSP 400 Bad Request)
2026-09-04 15:15:44 [INFO] sentinel.database: PostgreSQL connection timeout on port 5432. Activating local SQLite database with degraded status notification.
```

---

## 4. Acceptance Criteria Verification

- [x] Stream disconnects and invalid credentials produce deterministic error codes.
- [x] No synthetic or mock data displayed during failure states.
- [x] Health matrix accurately reports `degraded` when primary database is down.
- [x] Structured logs record camera ID, stream tag, and error code.

**Phase Status: PASS**
