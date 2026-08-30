"""Client for Model 1 (Centralized Camera Registry & PostGIS GIS Engine :8001)."""

import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.adapters.base import BaseServiceClient

logger = logging.getLogger("sentinel.adapter.model1")


class Model1Client(BaseServiceClient):
    """
    Consumes Model 1 external microservice:
    - Camera Inventory and PostGIS spatial queries
    - Department registry and GIS heatmaps
    """

    def __init__(self):
        super().__init__(service_name="Model1_GIS_Registry", base_url=settings.MODEL1_URL)

    async def get_cameras(self, page: int = 1, page_size: int = 100, district: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetches registered cameras from Model 1 PostGIS registry."""
        params = {"page": page, "page_size": page_size}
        if district:
            params["district"] = district
            
        data = await self.get("/cameras", params=params)
        if data and isinstance(data, dict):
            return data.get("items", [])
        elif isinstance(data, list):
            return data
        return []

    async def get_camera_by_id(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Fetches details for a specific camera."""
        return await self.get(f"/cameras/{camera_id}")

    async def query_spatial_radius(self, lat: float, lng: float, radius_km: float = 5.0) -> List[Dict[str, Any]]:
        """Queries cameras within a geographic radius via Model 1 PostGIS engine."""
        params = {"latitude": lat, "longitude": lng, "radius_km": radius_km}
        data = await self.get("/cameras/nearby", params=params)
        if data and isinstance(data, dict):
            return data.get("cameras", [])
        elif isinstance(data, list):
            return data
        return []

    async def get_departments(self) -> List[Dict[str, Any]]:
        """Fetches all registered state departments."""
        data = await self.get("/departments")
        if data and isinstance(data, dict):
            return data.get("items", [])
        elif isinstance(data, list):
            return data
        return []


# Global singleton client
model1_client = Model1Client()
