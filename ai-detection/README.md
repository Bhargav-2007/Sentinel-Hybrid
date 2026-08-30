# Gujarat Sentinel — AI Computer Vision & ANPR Engine
## Real-Time Person, Vehicle & License Plate Detection Service

Production-ready Computer Vision & Automatic Number Plate Recognition (ANPR) microservice built for the **Gujarat Police Innovation Challenge 2026 (Sentinel Hackathon)**.

---

## 1. Technology Stack

- **Ultralytics YOLO (YOLO11 / YOLOv8)**: Real-time object detection for pedestrians and vehicle categories (`car`, `truck`, `bus`, `motorcycle`, `bicycle`).
- **PaddleOCR / EasyOCR**: Text recognition engine fine-tuned for Indian High Security Registration Plates (HSRP) with state-code normalization (`GJ 01 AB 1234`).
- **ByteTrack**: Low-latency multi-object tracking preserving persistent temporal track IDs (`Track #1`, `Track #2`) across video stream frames.
- **OpenCV & FFmpeg**: Low-latency stream ingestion supporting RTSP-over-TCP, HLS (`.m3u8`), and WebRTC/WHEP from `https://live.corp8.cloud/`.
- **FastAPI**: High-throughput asynchronous REST API for seamless consumption by the central Sentinel Orchestration Backend.

---

## 2. Project Architecture

```
ai-detection/
├── models/                      # YOLO model weights
│   ├── download_models.py       # Weight download helper
│   └── README.md
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application entrypoint & routing
│   ├── config.py                # Pydantic BaseSettings & threshold parameters
│   ├── schemas.py               # Request & Response Pydantic v2 schemas
│   ├── detectors/
│   │   ├── __init__.py
│   │   ├── person_vehicle.py    # YOLO11/YOLOv8 Person and Vehicle Detector
│   │   ├── license_plate.py     # License Plate Bounding Box Localizer
│   │   └── tracker.py           # ByteTrack Multi-Object Temporal Tracker
│   ├── ocr/
│   │   ├── __init__.py
│   │   └── plate_reader.py      # PaddleOCR Engine + Indian HSRP regex cleaner
│   └── utils/
│       ├── __init__.py
│       ├── video.py             # RTSP / HLS stream frame grabber with TCP fallback
│       ├── drawing.py           # Police HUD visual overlay & Base64 encoders
│       └── device.py            # CUDA GPU -> Apple MPS -> CPU device discovery
├── scripts/
│   ├── run_live_stream.py       # Real-time CLI stream monitoring script
│   ├── train_person_vehicle.py  # Script for fine-tuning YOLO on Indian traffic
│   └── train_license_plate.py   # Script for fine-tuning YOLO on HSRP license plates
├── tests/
│   ├── __init__.py
│   └── test_ai_detection.py     # Comprehensive automated test suite
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 3. REST API Endpoints

### `GET /health`
Returns hardware acceleration telemetry, GPU availability, and model readiness.
```json
{
  "status": "healthy",
  "service": "Gujarat Sentinel AI Detection & ANPR Engine",
  "version": "2.0.0",
  "device": "cuda",
  "gpu_available": true,
  "gpu_device_name": "NVIDIA GeForce RTX",
  "models_loaded": {
    "yolo_person_vehicle": true,
    "yolo_license_plate": true,
    "ocr_engine": true
  },
  "supported_classes": ["person", "bicycle", "car", "motorcycle", "bus", "truck"]
}
```

---

### `POST /detect/person-vehicle`
Detects pedestrians and all vehicle categories with persistent ByteTrack tracking IDs.

**Request Payload:**
```json
{
  "image_base64": "<base64_encoded_jpeg>",
  "camera_id": "stream_1",
  "confidence_threshold": 0.35,
  "return_annotated_image": true
}
```

**Response:**
```json
{
  "status": "success",
  "camera_id": "stream_1",
  "inference_time_ms": 12.4,
  "total_people": 2,
  "total_vehicles": 4,
  "detections": [
    {
      "class_id": 2,
      "class_name": "car",
      "confidence": 0.982,
      "track_id": 14,
      "bbox": {
        "x1": 320.5,
        "y1": 210.0,
        "x2": 640.2,
        "y2": 450.8,
        "width": 319.7,
        "height": 240.8,
        "center_x": 480.35,
        "center_y": 330.4
      }
    }
  ],
  "annotated_image_base64": "..."
}
```

---

### `POST /detect/anpr`
Detects vehicle license plates and recognizes registration numbers normalized into standard Indian RTO formats (`GJ 01 AB 1234`).

**Response:**
```json
{
  "status": "success",
  "camera_id": "stream_1",
  "inference_time_ms": 16.8,
  "total_plates_detected": 1,
  "plates": [
    {
      "plate_number": "GJ01AB1234",
      "formatted_plate": "GJ 01 AB 1234",
      "raw_ocr_text": "IND GJ 01 AB 1234",
      "confidence": 0.985,
      "is_valid_indian_format": true,
      "bbox": {
        "x1": 420.0,
        "y1": 380.0,
        "x2": 540.0,
        "y2": 415.0,
        "width": 120.0,
        "height": 35.0,
        "center_x": 480.0,
        "center_y": 397.5
      },
      "plate_crop_base64": "..."
    }
  ]
}
```

---

### `POST /detect/full`
Combined single-call pipeline executing Person Detection, Vehicle Classification, ByteTrack Multi-Object Tracking, License Plate Localization, PaddleOCR text recognition, and Command-Center HUD visual drawing.

---

### `POST /stream/process-frame`
Connects directly to an RTSP or HLS stream from `live.corp8.cloud` and runs full AI inference on the latest real-time frame.

**Request:**
```json
{
  "stream_url": "rtsp://live.corp8.cloud:8554/stream/1",
  "camera_id": "stream_1",
  "detect_plates": true,
  "track_objects": true,
  "return_annotated_frame": true
}
```

---

## 4. Live Stream Processing from `live.corp8.cloud`

Run real-time continuous stream processing via the provided CLI tool:

```bash
# Monitor Camera 1 (SG Highway Junction)
python scripts/run_live_stream.py --stream-id 1 --interval 1.0 --frames 30

# Monitor Camera 15 (Surat Ring Road)
python scripts/run_live_stream.py --stream-id 15 --interval 0.5 --frames 50
```

---

## 5. Model Fine-Tuning Instructions

### Fine-Tuning Person & Vehicle YOLO:
```bash
python scripts/train_person_vehicle.py \
  --data data/traffic_data.yaml \
  --weights yolov8n.pt \
  --epochs 50 \
  --batch 16 \
  --imgsz 640 \
  --device 0
```

### Fine-Tuning License Plate YOLO:
```bash
python scripts/train_license_plate.py \
  --data data/plate_data.yaml \
  --weights yolov8n.pt \
  --epochs 60 \
  --batch 16 \
  --imgsz 640 \
  --device 0
```

---

## 6. Docker Deployment

Build and run as a standalone container:
```bash
docker build -t sentinel-ai-detection .
docker run -d --name sentinel-ai -p 8006:8006 --gpus all sentinel-ai-detection
```

Or run locally with Uvicorn:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload
```
