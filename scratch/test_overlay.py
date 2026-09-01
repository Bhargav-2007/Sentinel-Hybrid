import os
import cv2
from ultralytics import YOLO

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

model = YOLO("yolov8n.pt")
cap = cv2.VideoCapture("rtsp://103.250.160.189:8554/stream/cam01", cv2.CAP_FFMPEG)
ret, frame = cap.read()
cap.release()

if ret and frame is not None:
    results = model(frame, conf=0.18, imgsz=1280, classes=[0, 1, 2, 3, 5, 7])
    boxes = results[0].boxes
    h, w, _ = frame.shape

    counts = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0, "person": 0, "auto": 0}

    for box in boxes:
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        cls_name = model.names[cls_id]

        bw = x2 - x1
        bh = y2 - y1
        aspect = bh / max(1, bw)
        if cls_name == "car" and 0.8 < aspect < 1.3:
            cls_name = "auto-rickshaw"
            counts["auto"] += 1
        elif cls_name in counts:
            counts[cls_name] += 1

        color = (0, 255, 120)
        if cls_name in ("bus", "truck"):
            color = (0, 180, 255)
        elif cls_name in ("motorcycle", "bicycle"):
            color = (255, 220, 0)
        elif cls_name == "person":
            color = (255, 100, 255)
        elif cls_name == "auto-rickshaw":
            color = (0, 230, 255)

        # Draw box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        # Draw corner brackets
        cl = min(15, bw // 4, bh // 4)
        if cl > 4:
            cv2.line(frame, (x1, y1), (x1 + cl, y1), color, 3)
            cv2.line(frame, (x1, y1), (x1, y1 + cl), color, 3)
            cv2.line(frame, (x2, y1), (x2 - cl, y1), color, 3)
            cv2.line(frame, (x2, y1), (x2, y1 + cl), color, 3)
            cv2.line(frame, (x1, y2), (x1 + cl, y2), color, 3)
            cv2.line(frame, (x1, y2), (x1, y2 - cl), color, 3)
            cv2.line(frame, (x2, y2), (x2 - cl, y2), color, 3)
            cv2.line(frame, (x2, y2), (x2, y2 - cl), color, 3)

        label = f"{cls_name.upper()} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        tag_y = max(th + 6, y1)
        cv2.rectangle(frame, (x1, tag_y - th - 6), (x1 + tw + 8, tag_y + 2), color, -1)
        cv2.putText(frame, label, (x1 + 4, tag_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

    # Top HUD
    cv2.rectangle(frame, (10, 10), (450, 52), (15, 20, 30), -1)
    cv2.rectangle(frame, (10, 10), (450, 52), (0, 240, 255), 1)
    cv2.putText(frame, "GUJARAT POLICE SENTINEL - CAM01", (18, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 240, 255), 1, cv2.LINE_AA)
    summary_txt = f"AI TARGETS: {len(boxes)} | CARS:{counts['car']} AUTOS:{counts['auto']} BIKES:{counts['motorcycle']} PEDS:{counts['person']}"
    cv2.putText(frame, summary_txt, (18, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 150), 1, cv2.LINE_AA)

    cv2.imwrite("evidence/cam01_rendered_detection.jpg", frame)
    print(f"Rendered detection frame saved! Total detections: {len(boxes)}")
