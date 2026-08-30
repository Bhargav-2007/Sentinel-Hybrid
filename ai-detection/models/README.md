# Model Weights Directory

This directory stores YOLO neural network weights for:
- `yolov8n.pt` / `yolo11n.pt`: Person & Vehicle detection (COCO pretrained)
- `license_plate_yolo.pt`: Dedicated License Plate localizer

The service automatically loads weights from this folder or downloads base pretrained weights on first boot.
