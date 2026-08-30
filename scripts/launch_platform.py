"""Gujarat Sentinel — Unified Platform Launcher & Localhost Control Center."""

import sys
import os
import time
import webbrowser
import requests

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

PORTAL_CONFIG = [
    {
        "category": "👑 PRIMARY CONTROL ROOM & ORCHESTRATION",
        "items": [
            {
                "name": "Police Command Center UI (Frontend)",
                "url": "http://localhost:3001",
                "health_url": "http://localhost:3001",
                "port": 3001,
                "desc": "React 19 Video Wall, Leaflet GIS map, Live Alerts & ANPR Triage"
            },
            {
                "name": "Central Brain Orchestrator API & Docs",
                "url": "http://localhost:8005/docs",
                "health_url": "http://localhost:8005/health",
                "port": 8005,
                "desc": "FastAPI Central Brain, Officer Auth, Watchlists, Section 65B HMAC"
            },
            {
                "name": "Hybrid API Gateway",
                "url": "http://localhost:8000/health",
                "health_url": "http://localhost:8000/health",
                "port": 8000,
                "desc": "Go Reverse Proxy routing live video, ANPR, and metadata"
            },
        ]
    },
    {
        "category": "🤖 AI & COMPUTER VISION MICROSERVICES",
        "items": [
            {
                "name": "Model 1 — Registry & PostGIS GIS Engine",
                "url": "http://localhost:8001/docs",
                "health_url": "http://localhost:8001/health",
                "port": 8001,
                "desc": "Camera metadata catalog, PostGIS spatial queries, GIS heatmaps"
            },
            {
                "name": "Model 2 — Unified Live Viewer & ANPR",
                "url": "http://localhost:8002/docs",
                "health_url": "http://localhost:8002/health",
                "port": 8002,
                "desc": "PyAV video ingestion, YOLOv8 object detection, PaddleOCR ANPR"
            },
            {
                "name": "Model 3 — VMS Federation & PTZ Control",
                "url": "http://localhost:8003/actuator/health",
                "health_url": "http://localhost:8003/actuator/health",
                "port": 8003,
                "desc": "Java Spring Boot Hikvision/Dahua adapters, PTZ camera dispatch"
            },
            {
                "name": "Model 4 — Trajectory Tracking & S3 Store",
                "url": "http://localhost:8004/api/v1/tracking/vehicles",
                "health_url": "http://localhost:8004/health",
                "port": 8004,
                "desc": "Go multi-camera route tracking, PTS speed delta, MinIO video store"
            },
            {
                "name": "AI Computer Vision & ANPR Engine",
                "url": "http://localhost:8006/docs",
                "health_url": "http://localhost:8006/health",
                "port": 8006,
                "desc": "Ultralytics YOLO11/v8 + ByteTrack + PaddleOCR ANPR microservice"
            },
        ]
    },
    {
        "category": "📊 OBSERVABILITY & CLUSTER MANAGEMENT",
        "items": [
            {
                "name": "Grafana SRE Command Dashboards",
                "url": "http://localhost:3000",
                "health_url": "http://localhost:3000/api/health",
                "port": 3000,
                "desc": "4 SOC dashboards (Overview, ANPR Deep-Dive, Incidents, Cluster Infra)"
            },
            {
                "name": "Kafka Web Management UI",
                "url": "http://localhost:8082",
                "health_url": "http://localhost:8082",
                "port": 8082,
                "desc": "Event stream viewer (sentinel.detections.raw, sentinel.alerts.urgent)"
            },
            {
                "name": "MinIO S3 Object Storage Console",
                "url": "http://localhost:9005",
                "health_url": "http://localhost:9000/minio/health/live",
                "port": 9005,
                "desc": "Video clips and snapshots store (User: minioadmin / Pass: minioadmin)"
            },
            {
                "name": "OpenSearch Dashboards",
                "url": "http://localhost:5601",
                "health_url": "http://localhost:5601/api/status",
                "port": 5601,
                "desc": "Log aggregation, audit trails, and Section 65B forensic search"
            },
            {
                "name": "Prometheus Metrics Server",
                "url": "http://localhost:9090",
                "health_url": "http://localhost:9090/-/healthy",
                "port": 9090,
                "desc": "Prometheus time-series metrics scraper & alerting rules"
            },
        ]
    }
]


def check_health(url: str) -> str:
    """Probes endpoint with 1.5s timeout."""
    try:
        r = requests.get(url, timeout=1.5)
        if r.status_code in (200, 201, 302):
            return "[ONLINE]"
        return f"[{r.status_code}]"
    except Exception:
        return "[OFFLINE]"


def display_portal():
    os.system("cls" if os.name == "nt" else "clear")
    print("=" * 105)
    print("       GUJARAT SENTINEL — UNIFIED SURVEILLANCE INTELLIGENCE PLATFORM")
    print("       Gujarat Police Innovation Challenge 2026 • Localhost Command Portal")
    print("=" * 105)

    all_items = []
    idx = 1

    for section in PORTAL_CONFIG:
        print(f"\n{section['category']}")
        print("-" * 105)
        print(f" {'#':<3} | {'SERVICE NAME':<38} | {'PORT':<6} | {'STATUS':<9} | {'DIRECT URL'}")
        print("-" * 105)

        for item in section["items"]:
            status = check_health(item["health_url"])
            print(f" [{idx:02d}] | {item['name']:<38} | {item['port']:<6} | {status:<9} | {item['url']}")
            all_items.append(item)
            idx += 1

    print("\n" + "=" * 105)
    print(" DEMO CREDENTIALS (OFFICER BADGE AUTH):")
    print("   • Officer Badge ID:  POLICE-AHM-042   |   Password:  Sentinel@2026")
    print("   • MinIO Storage:     minioadmin       |   Password:  minioadmin")
    print("   • Grafana Dashboards: Anonymous Enabled (or admin / admin)")
    print("=" * 105)
    print("\nACTIONS:")
    print("  • Enter number (1-13) to open that service in your browser")
    print("  • Enter 'A' to open ALL primary dashboards in browser tabs")
    print("  • Enter 'R' to refresh health status")
    print("  • Enter 'Q' to quit")
    print("-" * 105)

    return all_items


def interactive_loop():
    while True:
        items = display_portal()
        try:
            choice = input("\n👉 Select option: ").strip().upper()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting portal.")
            break

        if choice == "Q":
            print("Exiting Gujarat Sentinel portal.")
            break
        elif choice == "R" or choice == "":
            continue
        elif choice == "A":
            print("Opening primary dashboards in browser...")
            for url in [
                "http://localhost:3001",
                "http://localhost:8005/docs",
                "http://localhost:3000",
                "http://localhost:8082",
                "http://localhost:9005"
            ]:
                webbrowser.open(url)
                time.sleep(0.3)
        else:
            try:
                num = int(choice)
                if 1 <= num <= len(items):
                    selected = items[num - 1]
                    print(f"Opening {selected['name']} ({selected['url']})...")
                    webbrowser.open(selected["url"])
                    time.sleep(0.5)
                else:
                    print(f"Invalid selection: {num}")
                    time.sleep(1)
            except ValueError:
                print("Invalid input. Please enter a number, 'A', 'R', or 'Q'.")
                time.sleep(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        display_portal()
    else:
        interactive_loop()
