"""
Gujarat Sentinel — Model 2 Pipeline

Core ANPR processing pipeline:
  stream_manager   → RTSP TCP consumers with reconnection
  anpr_engine      → YOLOv8n detection + PaddleOCR plate reading
  detection_processor → Full pipeline orchestration (VAHAN → DB → Kafka → Alert)
"""
