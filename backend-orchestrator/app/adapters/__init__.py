"""External service adapters for communicating with the 4 existing AI model backends and Sentinel sandbox."""

from app.adapters.model1_client import model1_client
from app.adapters.model2_client import model2_client
from app.adapters.model3_client import model3_client
from app.adapters.model4_client import model4_client
from app.adapters.sentinel_feed_adapter import sentinel_feed_adapter

__all__ = [
    "model1_client",
    "model2_client",
    "model3_client",
    "model4_client",
    "sentinel_feed_adapter",
]
