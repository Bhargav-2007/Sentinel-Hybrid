# Phase Blocker Register

**Audit Date**: 2026-09-04T15:23:00+05:30  
**Status**: Active Production Hardening Governance  

---

## Blocker Tracking Table

| ID | Phase | Component | Severity | Blocking | Description | Evidence | Owner | Resolution / Mitigation | Status |
|---|---|---|---|---|---|---|---|---|---|
| **BLK-001** | Phase 01 | Security / Docs | **CRITICAL** | **YES** | Plaintext CCTV gateway password was exposed in `docs/PRODUCTION_TRUTH_MATRIX.md:24`. | Git log commit `c3a9ceb` | Security Lead | Purged plaintext string; replaced with `[REDACTED_RUNTIME_CREDENTIAL]`; added `**/.env*` to `.gitignore`. | **RESOLVED** |
| **BLK-002** | Phase 04 | Camera Service | **HIGH** | **YES** | Camera onboarding in `camera_service.py` initialized default status to `CameraStatus.ONLINE` before probing. | Source audit line 148 | Backend Lead | Changed default status to `CameraStatus.OFFLINE` with `is_live=False` until real probe verifies stream. | **RESOLVED** |
| **BLK-003** | Phase 05 | Live Media / WebRTC | **MEDIUM** | **NO** | 6 cameras stream in H.265 (HEVC), which native WebRTC browsers cannot decode without OS-level flags. | Empirical SDP codec probe (`a=rtpmap:96 H265/90000`) | Video Lead | Registered exception `EX-002`; implemented server-side Snapshot HUD fallback (`/snapshot`). | **RESOLVED / EXCEPTION** |
| **BLK-004** | Phase 11 | Case Service | **HIGH** | **YES** | Case creation service previously inserted synthetic `68.2 km/h` speed and arbitrary PTS in empty cases. | Source audit lines 51–72 | Backend Lead | Refactored to query real `Detection` rows for target plate; set `speed_kmh=None` when uncalibrated. | **RESOLVED** |
| **BLK-005** | Phase 12 | Case UI Badge | **MEDIUM** | **YES** | Case dossier UI previously displayed static decorative badge `"4 Node(s) Verified"`. | `CasesPage.tsx:702` | Frontend Lead | Dynamically calculate `new Set(sightings.map(s => s.camera_id)).size`. | **RESOLVED** |
| **BLK-006** | Phase 14 | AI Compute Scalability | **HIGH** | **YES** | Single-GPU host cannot sustain continuous 25 FPS inference across all 30 streams concurrently ($750\text{ FPS}$). | Measured 44.4ms inference ($\approx 22.5\text{ FPS}$ max single-node throughput) | Infra Lead | Registered exception `EX-005`; implemented temporal frame decimation (2 FPS sampling) and multi-worker edge topology. | **RESOLVED / EXCEPTION** |
| **BLK-007** | Phase 13 | Multi-Camera Tracking | **LOW** | **NO** | No physical vehicle transited between multiple active cameras during the audit window. | Empirical CCTV stream observation | AI Lead | Truthfully marked capability `IMPLEMENTED + NOT VERIFIED IN LIVE RE-ID` per Phase Rule 10. | **DOCUMENTED** |

---

## Blocker Severity Definitions

- **CRITICAL**: Threatens credential security or corrupts operational surveillance integrity.
- **HIGH**: Impedes functional verification of mandatory challenge requirements.
- **MEDIUM**: Degrades user experience or transport compatibility without corrupting data.
- **LOW**: Informational or unobserved live edge cases.
