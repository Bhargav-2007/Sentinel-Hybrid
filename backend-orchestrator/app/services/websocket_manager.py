"""Real-time WebSocket Connection Manager with Redis Pub/Sub integration."""

import json
import logging
from typing import List, Dict, Any, Set
from fastapi import WebSocket
from app.core.redis_client import redis_manager

logger = logging.getLogger("sentinel.services.websocket")


class WebSocketConnectionManager:
    """
    Manages real-time WebSocket connections with police command center clients.
    Broadcasts APB threat alerts, ANPR detection feeds, and live camera health status.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        """Accepts and registers a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        """Unregisters a disconnected WebSocket client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """Dispatches an event payload to all connected frontend clients."""
        payload = {
            "type": event_type,
            "data": data,
        }
        text_data = json.dumps(payload)
        
        # 1. Publish to Redis for other worker nodes (Horizontal Scalability)
        await redis_manager.publish(f"sentinel:{event_type}", payload)

        # 2. Broadcast directly to local WebSocket clients
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(text_data)
            except Exception as e:
                logger.debug(f"Error sending to WebSocket client: {e}")
                dead_connections.add(connection)

        # Clean up dead sockets
        for dead in dead_connections:
            self.disconnect(dead)

    async def broadcast_alert(self, alert_data: Dict[str, Any]) -> None:
        """Broadcasts a high-priority APB alert."""
        await self.broadcast_event("NEW_ALERT", alert_data)

    async def broadcast_alert_update(self, update_data: Dict[str, Any]) -> None:
        """Broadcasts an alert status update."""
        await self.broadcast_event("ALERT_UPDATED", update_data)

    async def broadcast_detection(self, detection_data: Dict[str, Any]) -> None:
        """Broadcasts a live ANPR detection."""
        await self.broadcast_event("NEW_DETECTION", detection_data)

    async def broadcast_camera_status(self, camera_id: str, status: str) -> None:
        """Broadcasts a camera health state change."""
        await self.broadcast_event("CAMERA_STATUS", {"camera_id": camera_id, "status": status})


ws_manager = WebSocketConnectionManager()
