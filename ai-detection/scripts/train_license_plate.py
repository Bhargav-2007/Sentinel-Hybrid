"""Training script for fine-tuning YOLO on Indian High Security Registration Plate (HSRP) datasets."""

import argparse
import os


def train_license_plate(
    data_yaml: str = "data/plate_data.yaml",
    model_weights: str = "yolov8n.pt",
    epochs: int = 60,
    img_size: int = 640,
    batch_size: int = 16,
    device: str = "0"
):
    """
    Fine-tunes YOLO for dedicated license plate bounding box localization on Indian vehicles.
    """
    print("=================================================================")
    print("🎯 FINE-TUNING YOLO FOR LICENSE PLATE LOCALIZATION")
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
            name="sentinel_license_plate",
            save=True,
            plots=True
        )
        print("✓ License Plate training completed. Weights saved to runs/detect/sentinel_license_plate/weights/best.pt")
    except Exception as e:
        print(f"Notice: Training requires active GPU and formatted dataset: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune YOLO License Plate detector")
    parser.add_argument("--data", type=str, default="data/plate_data.yaml")
    parser.add_argument("--weights", type=str, default="yolov8n.pt")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--device", type=str, default="0")
    args = parser.parse_args()

    train_license_plate(
        data_yaml=args.data,
        model_weights=args.weights,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device
    )
