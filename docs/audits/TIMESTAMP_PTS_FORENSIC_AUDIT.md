# Timestamp & PTS Forensic Audit

**Document Identifier**: `docs/audits/TIMESTAMP_PTS_FORENSIC_AUDIT.md`  
**Related Phase**: Phase 06  
**Auditor**: Principal Forensic Media & Timestamp Specialist  
**Classification**: Forensic Verification  

---

## 1. Forensic Timestamp Chain

```text
Camera Sensor Optical Capture
           ↓
Encoder RTP Packetization (90 kHz clock timestamp)
           ↓
MediaMTX Gateway Re-muxing (TCP stream)
           ↓
OpenCV / FFmpeg Demuxer Timebase
           ↓
Decoder PTS: cv2.CAP_PROP_POS_MSEC (Relative Presentation Time in ms)
           ↓
Platform Normalized Ingestion Timestamp (UTC ISO-8601 from Server Clock)
           ↓
Persisted Detection Event Record
```

---

## 2. Technical Findings on `cv2.CAP_PROP_POS_MSEC`

1. **What it IS**:
   - The presentation time in milliseconds of the currently decoded video picture relative to the start of the demuxing context.
   - A monotonic counter that increments by the GOP frame duration (e.g. 40.0 ms for 25 FPS video, 33.33 ms for 30 FPS video).

2. **What it is NOT**:
   - It is **not** a GPS atomic clock.
   - It is **not** the camera's internal RTC battery hardware clock.
   - It is **not** independently certified for judicial proof of time of day without an accompanying cryptographic hash and server NTP wall-clock timestamp.

---

## 3. Cryptographic Integrity vs Legal Admissibility

Under the Indian Evidence Act Section 65B and the Bharatiya Sakshya Adhiniyam (BSA) 2023:
- Cryptographic hash chaining (`SHA-256`) and digital signatures (`HMAC-SHA256`) provide mathematical proof of **data integrity** (the frame has not been altered since hashing).
- They do **not** automatically confer legal admissibility without an accompanying officer certificate detailing system ownership, operational maintenance, and unbroken chain of custody.
- Therefore, the Sentinel-Hybrid platform refers to:
  - `Cryptographic Integrity`: Verified via SHA-256 and HMAC.
  - `Evidence Provenance`: Documented via officer badge audit trail.
  - `Decoded Presentation Timestamp`: Recorded via `pos_msec`.
