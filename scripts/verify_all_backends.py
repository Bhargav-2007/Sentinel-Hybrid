"""Comprehensive Gujarat Sentinel Platform — All Backend Health & Connectivity Verifier."""

import sys
import time
import json
import requests

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SERVICES = [
    {
        "name": "Hybrid Gateway & Reverse Proxy",
        "container": "sentinel-hybrid-gateway",
        "port": 8000,
        "health_url": "http://localhost:8000/health",
        "test_url": "http://localhost:8000/ready",
        "stack": "Go 1.23 • Gin • Reverse Proxy"
    },
    {
        "name": "Model 1 — Central Registry & PostGIS GIS Engine",
        "container": "sentinel-model1",
        "port": 8001,
        "health_url": "http://localhost:8001/health",
        "test_url": "http://localhost:8001/api/v1/cameras?page_size=2",
        "stack": "Python 3.12 • FastAPI • PostGIS"
    },
    {
        "name": "Model 2 — Unified Viewer & ANPR Processing",
        "container": "sentinel-model2",
        "port": 8002,
        "health_url": "http://localhost:8002/health",
        "test_url": "http://localhost:8002/api/v1/streams",
        "stack": "Python 3.12 • PyAV • YOLOv8n • PaddleOCR"
    },
    {
        "name": "Model 3 — VMS Federation & PTZ Control",
        "container": "sentinel-model3",
        "port": 8003,
        "health_url": "http://localhost:8003/actuator/health",
        "test_url": "http://localhost:8003/actuator/health",
        "stack": "Java 21 • Spring Boot 3.4 • Hikvision/Dahua"
    },
    {
        "name": "Model 4 — Central Trajectory & S3 Store",
        "container": "sentinel-model4",
        "port": 8004,
        "health_url": "http://localhost:8004/health",
        "test_url": "http://localhost:8004/api/v1/tracking/vehicles",
        "stack": "Go 1.23 • Gin • Kafka • MinIO S3"
    },
    {
        "name": "Central Brain & Unified Orchestrator",
        "container": "sentinel-orchestrator",
        "port": 8005,
        "health_url": "http://localhost:8005/health",
        "test_url": "http://localhost:8005/api/v1/cameras?limit=3",
        "stack": "Python 3.11 • FastAPI • SQLAlchemy 2.0 • Redis"
    },
    {
        "name": "AI Vision & ANPR Engine",
        "container": "sentinel-ai-detection",
        "port": 8006,
        "health_url": "http://localhost:8006/health",
        "test_url": "http://localhost:8006/",
        "stack": "Python 3.11 • Ultralytics YOLO • ByteTrack • PaddleOCR"
    },
]


def test_all_backends():
    print("==========================================================================================")
    print("[SENTINEL] ALL BACKENDS CONNECTIVITY & HEALTH AUDIT")
    print("==========================================================================================")
    print(f"{'SERVICE NAME':<45} | {'PORT':<6} | {'STATUS':<12} | {'LATENCY':<8} | {'DETAILS'}")
    print("-" * 95)

    total_services = len(SERVICES)
    online_count = 0

    for s in SERVICES:
        name = s["name"]
        port = s["port"]
        health_url = s["health_url"]
        test_url = s["test_url"]

        t0 = time.time()
        try:
            res = requests.get(health_url, timeout=3.0)
            latency_ms = round((time.time() - t0) * 1000.0, 1)

            if res.status_code in (200, 201):
                status_str = "[ONLINE]"
                online_count += 1
                details = f"HTTP {res.status_code} ({s['stack'].split('•')[0].strip()})"
            else:
                status_str = f"[HTTP {res.status_code}]"
                details = res.text[:30]
        except Exception as e:
            latency_ms = round((time.time() - t0) * 1000.0, 1)
            status_str = "[OFFLINE]"
            details = f"Connection error: {str(e)[:30]}"

        print(f"{name:<45} | {port:<6} | {status_str:<12} | {f'{latency_ms}ms':<8} | {details}")

    print("=" * 95)
    print(f"SUMMARY: {online_count}/{total_services} Backend Microservices Operational & Connected.")
    print("==========================================================================================")


if __name__ == "__main__":
    test_all_backends()
