"""Standalone CLI Live Stream Processor for live.corp8.cloud camera feeds."""

import argparse
import sys
import os
import time
import requests

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


def run_stream_monitoring(
    stream_id: str = "1",
    api_url: str = "http://localhost:8006",
    host: str = "live.corp8.cloud",
    interval: float = 1.0,
    max_frames: int = 20
):
    """
    Connects to a Sentinel camera stream and periodically requests AI detection & ANPR analysis.
    """
    rtsp_url = f"rtsp://{host}:8554/stream/{stream_id}"
    print("=================================================================")
    print("🛡️  GUJARAT SENTINEL — LIVE AI STREAM MONITOR")
    print(f"   Target Stream: {rtsp_url}")
    print(f"   AI Inference API: {api_url}/detect/full")
    print("=================================================================")

    processed = 0
    while processed < max_frames:
        processed += 1
        payload = {
            "stream_url": rtsp_url,
            "camera_id": f"stream_{stream_id}",
            "return_annotated_frame": False,
        }

        try:
            t0 = time.time()
            res = requests.post(f"{api_url}/stream/process-frame", json=payload, timeout=8.0)
            latency = (time.time() - t0) * 1000.0

            if res.status_code == 200:
                data = res.json()
                counts = data.get("counts", {})
                plates = data.get("license_plates", [])
                plate_str = ", ".join([p["formatted_plate"] for p in plates]) if plates else "None"

                print(
                    f"[{processed}/{max_frames}] Latency: {latency:.1f}ms | "
                    f"People: {counts.get('people', 0)} | "
                    f"Vehicles: {counts.get('cars', 0) + counts.get('trucks', 0) + counts.get('buses', 0)} | "
                    f"Plates: {plate_str}"
                )
            else:
                print(f"[{processed}/{max_frames}] API returned status {res.status_code}")
        except Exception as e:
            print(f"[{processed}/{max_frames}] Error contacting AI engine: {e}")

        time.sleep(interval)

    print("\n✓ Live stream evaluation completed successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sentinel Live Stream AI Processor")
    parser.add_argument("--stream-id", type=str, default="1", help="Stream ID on live.corp8.cloud (e.g. 1 to 50)")
    parser.add_argument("--api-url", type=str, default="http://localhost:8006", help="AI Detection API base URL")
    parser.add_argument("--interval", type=float, default=1.0, help="Inference polling interval in seconds")
    parser.add_argument("--frames", type=int, default=10, help="Max frames to process")
    args = parser.parse_args()

    run_stream_monitoring(
        stream_id=args.stream_id,
        api_url=args.api_url,
        interval=args.interval,
        max_frames=args.frames
    )
