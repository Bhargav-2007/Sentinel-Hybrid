"""Client for Model 2 (Unified Viewing & ANPR Processing with YOLOv8 & PaddleOCR :8002)."""

import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.adapters.base import BaseServiceClient

logger = logging.getLogger("sentinel.adapter.model2")


class Model2Client(BaseServiceClient):
    """
    Consumes Model 2 external microservice:
    - RTSP/WebRTC/HLS live video stream management
    - Real-time YOLOv8 vehicle detection & PaddleOCR plate extraction
    - Live ANPR events and confidence scores
    """

    def __init__(self):
        super().__init__(service_name="Model2_ANPR_Viewer", base_url=settings.MODEL2_URL)

    async def get_streams(self) -> List[Dict[str, Any]]:
        """Queries active streams and their health from Model 2."""
        data = await self.get("/streams")
        if data and isinstance(data, list):
            return data
        elif data and isinstance(data, dict):
            return data.get("streams", [])
        return []

    async def get_latest_anpr_detections(self, limit: int = 50, camera_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetches recent ANPR detections processed by Model 2."""
        params = {"limit": limit}
        if camera_id:
            params["camera_id"] = camera_id
        data = await self.get("/anpr/detections", params=params)
        if data and isinstance(data, list):
            return data
        elif data and isinstance(data, dict):
            return data.get("detections", [])
        return []

    async def trigger_frame_analysis(self, camera_id: str, snapshot_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Requests Model 2 to execute YOLOv8 + PaddleOCR inference on a video frame."""
        payload = {"camera_id": camera_id, "snapshot_url": snapshot_url}
        return await self.post("/anpr/process", payload=payload)

    async def get_anpr_statistics(self) -> Dict[str, Any]:
        """Fetches detection totals, plate count, and model accuracy from Model 2."""
        data = await self.get("/anpr/stats")
        if data and isinstance(data, dict):
            return data
        return {
            "total_detections": 0,
            "unique_plates": 0,
            "avg_confidence": 0.0,
            "active_anpr_feeds": 0,
            "status": "OFFLINE",
            "message": "AI Detection service offline or unreachable"
        }


# Global singleton client
model2_client = Model2Client()
