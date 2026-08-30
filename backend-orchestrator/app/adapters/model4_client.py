"""Client for Model 4 (Central Trajectory Tracking & S3 Object Store — Go 1.23 :8004)."""

import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.adapters.base import BaseServiceClient

logger = logging.getLogger("sentinel.adapter.model4")


class Model4Client(BaseServiceClient):
    """
    Consumes Model 4 external microservice:
    - Multi-camera spatial vehicle trajectory tracking
    - Corridor progression timeline & PTS delta speed calculations
    - MinIO S3 evidence snapshot indexing
    """

    def __init__(self):
        super().__init__(service_name="Model4_Trajectory_Tracking", base_url=settings.MODEL4_URL)

    async def get_vehicle_trajectory(self, plate: str) -> Optional[Dict[str, Any]]:
        """Queries cross-camera movement trajectory for a specific vehicle plate."""
        clean_plate = plate.strip().upper().replace(" ", "")
        return await self.get(f"/tracking/{clean_plate}")

    async def ingest_encounter_event(self, encounter_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Forwards an ANPR checkpoint encounter event to Model 4 Kafka stream."""
        return await self.post("/tracking/encounter", payload=encounter_data)

    async def get_active_pursuits(self) -> List[Dict[str, Any]]:
        """Queries active multi-camera target vehicle pursuit tracking sessions."""
        data = await self.get("/tracking/pursuits")
        if data and isinstance(data, list):
            return data
        return []


# Global singleton client
model4_client = Model4Client()
