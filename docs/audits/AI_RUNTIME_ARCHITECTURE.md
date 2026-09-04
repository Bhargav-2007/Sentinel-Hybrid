# Authoritative AI Runtime Architecture

**Document Identifier**: `docs/audits/AI_RUNTIME_ARCHITECTURE.md`  
**Related Phase**: Phase 07  
**Lead Architect**: Principal AI & Computer Vision Systems Architect  

---

## 1. Unified Pipeline Flow

```text
RTSP Stream (103.250.160.189:8554/stream/{cam_id})
       ↓
OpenCV VideoCapture (CAP_FFMPEG with TCP transport)
       ↓
Raw Decoded Frame Matrix (1920x1080 BGR)
       ↓
YOLOv8 Neural Inference (yolov8n.pt)
  ├── Vehicle Detection: car, truck, bus, motorcycle
  └── Person Detection: pedestrian bounding boxes
       ↓
ByteTrack Multi-Object Tracker (persistent track_id)
       ↓
License Plate Localization (Vehicle Lower BBox ROI)
       ↓
Plate Optical Quality Assessment:
  ├── If Sharp & Legible → EasyOCR / PaddleOCR Text Extraction
  └── If Blurred / Distant (>30m) → Truthfully Flagged as "UNREADABLE-TRACK-{id}"
       ↓
Normalization & Temporal Consensus Voting
       ↓
Structured JSON Sighting Event Generation
       ↓
HTTP POST to Backend Orchestrator (:8000)
       ↓
Persistence in Database (PostgreSQL/SQLite) & Trajectory Correlator
       ↓
WebSocket Broadcast to Police Officer Surveillance UI
```

---

## 2. Model & Runtime Specifications

- **Ultralytics YOLOv8**: Version 8.1.0+ (`yolov8n.pt`, 6.5 MB weights).
- **Tracker**: ByteTrack using Kalman filter velocity forecasting and Hungarian algorithm cost matrix.
- **OCR Engine**: EasyOCR / PaddleOCR fine-tuned for Indian High Security Registration Plates (HSRP).
- **Execution Target**: Single-node GPU (CUDA/DirectML) with automatic fallback to CPU.
- **Frame Batching**: Bounded buffer (`buffer_size=1`) to guarantee real-time latency (<200 ms).
