"""Training script for fine-tuning YOLO11/YOLOv8 on Person and Vehicle traffic datasets."""

import argparse
import os


def train(
    data_yaml: str = "data/traffic_data.yaml",
    model_weights: str = "yolov8n.pt",
    epochs: int = 50,
    img_size: int = 640,
    batch_size: int = 16,
    device: str = "0"
):
    """
    Fine-tunes Ultralytics YOLO model on custom Indian traffic surveillance dataset.
    Target classes: person, car, truck, bus, motorcycle, auto_rickshaw.
    """
    print("=================================================================")
    print("🚀 FINE-TUNING YOLO ON PERSON & VEHICLE TRAFFIC DATASET")
    print(f"   Base Weights: {model_weights}")
    print(f"   Data Config:  {data_yaml}")
    print(f"   Epochs:       {epochs} | Image Size: {img_size}")
    print("=================================================================")

    try:
        from ultralytics import YOLO
        model = YOLO(model_weights)
        results = model.train(
            data=data_yaml,
            epochs=epochs,
            imgsz=img_size,
            batch=batch_size,
            device=device,
            name="sentinel_person_vehicle",
            save=True,
            plots=True
        )
        print("✓ Training completed. Best weights exported to runs/detect/sentinel_person_vehicle/weights/best.pt")
    except Exception as e:
        print(f"Notice: Training requires active GPU and formatted dataset: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune YOLO Person & Vehicle detector")
    parser.add_argument("--data", type=str, default="data/traffic_data.yaml")
    parser.add_argument("--weights", type=str, default="yolov8n.pt")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--device", type=str, default="0")
    args = parser.parse_args()

    train(
        data_yaml=args.data,
        model_weights=args.weights,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device
    )
