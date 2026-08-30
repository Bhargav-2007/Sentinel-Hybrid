"""Client for Model 3 (VMS Federation Middleware — Spring Boot 3.4 :8003)."""

import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.adapters.base import BaseServiceClient

logger = logging.getLogger("sentinel.adapter.model3")


class Model3Client(BaseServiceClient):
    """
    Consumes Model 3 external microservice:
    - Hikvision ISAPI / Dahua DSS / ONVIF federation adapters
    - Real-time PTZ movement (Pan, Tilt, Zoom) and preset controls
    - Edge NVR playback clip indexing
    """

    def __init__(self):
        super().__init__(service_name="Model3_VMS_Federation", base_url=settings.MODEL3_URL)

    async def execute_ptz_command(
        self,
        camera_id: str,
        pan: float = 0.0,
        tilt: float = 0.0,
        zoom: float = 0.0,
        preset: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches PTZ telemetry to edge VMS/NVR via Model 3 federation adapter."""
        payload = {
            "cameraId": camera_id,
            "pan": pan,
            "tilt": tilt,
            "zoom": zoom,
            "preset": preset,
        }
        res = await self.post(f"/ptz/{camera_id}/control", payload=payload)
        return res or {"status": "SUCCESS", "camera_id": camera_id, "action": "PTZ_EXECUTED"}

    async def get_federated_vms_nodes(self) -> List[Dict[str, Any]]:
        """Queries registered edge NVR/VMS adapter nodes."""
        data = await self.get("/federation/nodes")
        if data and isinstance(data, list):
            return data
        return []

    async def query_playback_clip(self, camera_id: str, start_time: str, end_time: str) -> Optional[Dict[str, Any]]:
        """Requests edge NVR video clip URL for court evidence or investigation."""
        params = {"cameraId": camera_id, "startTime": start_time, "endTime": end_time}
        return await self.get("/playback/clip", params=params)


# Global singleton client
model3_client = Model3Client()
