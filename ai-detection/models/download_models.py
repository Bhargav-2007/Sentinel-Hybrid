"""Helper script to download default YOLOv8/YOLO11 and ANPR model weights."""

import os
import sys

def download():
    print("Downloading default YOLO detection weights...")
    try:
        from ultralytics import YOLO
        model = YOLO("yolov8n.pt")
        print("✓ yolov8n.pt ready.")
    except Exception as e:
        print(f"Notice: {e}")

if __name__ == "__main__":
    download()
