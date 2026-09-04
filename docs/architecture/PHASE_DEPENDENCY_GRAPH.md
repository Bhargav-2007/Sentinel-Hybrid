# Gujarat Sentinel-Hybrid: Phase Dependency Graph & Execution Model

**Document Version**: 1.0.0  
**Classification**: Authoritative Governance & AI Agent Execution Model  
**Last Updated**: 2026-09-04  

---

## 1. Master Phase Dependency Model

```mermaid
graph TD
    P00[Phase 00: BASELINE & FREEZE] --> P01[Phase 01: SECURITY & HYGIENE]
    P01 --> P02[Phase 02: ARCHITECTURE AUDIT]
    P02 --> P03[Phase 03: CCTV GATEWAY PROBE]
    P03 --> P04[Phase 04: CAMERA REGISTRY]
    P04 --> P05[Phase 05: LIVE MEDIA PIPELINE]
    P03 --> P05
    P05 --> P06[Phase 06: FRAME & PTS FORENSICS]
    P05 --> P07[Phase 07: AI RUNTIME ARCHITECTURE]
    P06 --> P07
    P07 --> P08[Phase 08: SINGLE-CAMERA AI PROOF]
    P08 --> P09[Phase 09: EVENT PERSISTENCE]
    P09 --> P10[Phase 10: SEARCH & SIGHTINGS]
    P10 --> P11[Phase 11: CASE MANAGEMENT]
    P11 --> P12[Phase 12: VERIFIED NODE AUDIT]
    P08 --> P13[Phase 13: CROSS-CAMERA CORRELATION]
    P09 --> P13
    P08 --> P14[Phase 14: 30-CAMERA FLEET SCALING]
    P09 --> P14
    P13 --> P14
    P14 --> P15[Phase 15: PERFORMANCE & CAPACITY]
    P05 --> P16[Phase 16: FAILURE & RECOVERY]
    P09 --> P16
    P14 --> P16
    P09 --> P17[Phase 17: FRONTEND INTEGRATION]
    P10 --> P17
    P11 --> P17
    P17 --> P18[Phase 18: BROWSER FUNCTIONALITY]
    P18 --> P19[Phase 19: OFFICER UI/UX]
    P19 --> P20[Phase 20: BONUS CAPABILITIES]
    P20 --> P21[Phase 21: REQUIREMENTS TRACEABILITY]
    P21 --> P22[Phase 22: DOCUMENTATION SYNCHRONY]
    P22 --> P23[Phase 23: REPOSITORY TRUTH AUDIT]
    P23 --> P24[Phase 24: FINAL SECURITY AUDIT]
    P24 --> P25[Phase 25: CLEAN DEPLOYMENT]
    P25 --> P26[Phase 26: FINAL LIVE REGRESSION]
    P26 --> P27[Phase 27: FINAL PRODUCTION TRUTH]
```

---

## 2. Hard Phase-Gating Rules

1. **RTSP Unreachable Rule**: If Phase 03 fails network or authentication on a stream, downstream AI ingestion (Phase 08) for that stream is strictly **BLOCKED**.
2. **Anti-Mock Database Rule**: Live operational persistence must never silently fall back to SQLite when PostgreSQL is the configured production target. SQLite is permitted solely for test/dev sandboxes.
3. **No-Hallucination ANPR Rule**: When character optical confidence is $<0.50$, the system must tag the plate as `UNREADABLE-TRACK-{id}` rather than inventing synthetic characters.
4. **Hardcoded Badge Rule**: Case dossiers must derive verified node counts strictly from `COUNT(DISTINCT camera_id)`; static constants are prohibited.
5. **Security Precedence Rule**: An unredacted credential immediately suspends current engineering and triggers regression back to Phase 01.

---

## 3. Registered Exceptions Handled in Dependency Flow

- `EX-001` (Direct WHEP vs Proxy): Handled between Phase 05 and Phase 17 via `/api/v1/streams/{id}/whep`.
- `EX-002` (H.265 WebRTC Browser Limitation): Handled between Phase 05 and Phase 18 via Snapshot HUD proxy.
- `EX-003` (Decoder PTS Semantics): Clarified between Phase 06 and Phase 11.
- `EX-004` (Uncaptured Live Multi-Camera Transit): Classified as `IMPLEMENTED + NOT VERIFIED IN LIVE RE-ID` in Phase 13.
- `EX-005` (Single-GPU Fleet Capacity): Bounded at 12–15 streams at 2 FPS in Phase 14 & 15.
