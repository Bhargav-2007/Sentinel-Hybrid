"""Real-Time WebSocket Endpoint for Live Video Walls & Police SOC Consoles."""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("sentinel.api.ws")
router = APIRouter(tags=["Real-Time WebSockets"])


@router.websocket("/ws/live")
async def websocket_live_stream_endpoint(websocket: WebSocket):
    """
    Subscribes connected police command center dashboards and video walls to real-time events:
    - `NEW_ALERT`: Instant high-priority APB hotlist intercepts
    - `ALERT_UPDATED`: Incident lifecycle transitions (Acked, Investigating, Closed)
    - `NEW_DETECTION`: Live ANPR plate detections across all 50 cameras
    - `CAMERA_STATUS`: Heartbeat health state changes (Online, Offline)
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open and accept client ping / filter subscriptions
            data = await websocket.receive_text()
            # Echo heartbeat ping-pong
            if data == "ping":
                await websocket.send_text('{"type": "PONG"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)
