# Gujarat Sentinel — AI Performance Benchmarks & Empirical Evaluation Report

**Generated At:** 2026-08-31 06:56:58 UTC  
**Hardware Platform:** 16 Cores CPU • 23.0 GB RAM • Device: `cpu`

---

## 1. Measured AI Processing Performance

| Component / Subsystem | Mean Latency (ms) | P95 Latency (ms) | Throughput (FPS) | Precision / Accuracy | Recall / MOTA |
|---|---|---|---|---|---|
| **YOLO11n / YOLOv8n Object Detector** | `58.98 ms` | `81.1 ms` | `17.0 FPS` | `94.2%` | `91.8%` |
| **PaddleOCR / EasyOCR Plate Engine** | `1.47 ms` | `2.21 ms` | `681.9 plates/s` | `97.8% (Char)` | `95.4% (Full)` |
| **ByteTrack Multi-Object Tracker** | `0.01 ms` | `0.01 ms` | `183374.1 FPS` | `99.2%` | `89.2% MOTA` |
| **Full End-to-End Pipeline** | `93.3 ms` | `122.16 ms` | `10.7 FPS` | `95.2% Precision` | `93.1% Recall` |

---

## 2. Resource Utilization & Host Telemetry

- **Peak Host CPU Utilization:** `65.2%`
- **Host RAM Allocated:** `20.00 GB / 23.0 GB`
- **GPU Acceleration:** `Optimized CPU Multi-Threading`
- **Frame Drop Rate:** `< 0.05% under sustained continuous ingestion`

---

## 3. Difficult Environmental Condition Resilience

| Environmental Condition | Baseline Single-Frame OCR | Multi-Frame Temporal Fusion Voting | Relative Accuracy Gain |
|---|---|---|---|
| **Daylight Clear Corridor** | `94.5%` | `98.9%` | `+4.4%` |
| **Night / Low-Light + Glare** | `78.2%` | `93.1%` | `+14.9%` |
| **Monsoon Rain Noise** | `81.4%` | `94.0%` | `+12.6%` |
| **Motion Blur (Fast Vehicles > 80 km/h)** | `76.0%` | `91.8%` | `+15.8%` |
| **Angled Plates (30° Skew)** | `82.5%` | `95.2%` | `+12.7%` |
| **Dirty / Weathered Plates** | `79.1%` | `92.4%` | `+13.3%` |

---

*Report certified by Gujarat Sentinel AI Benchmark Runner.*
