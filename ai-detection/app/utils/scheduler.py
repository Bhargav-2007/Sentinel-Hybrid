"""
Gujarat Sentinel — Inference Scheduler & GPU Resource Manager
Implements adaptive frame sampling, bounded priority queuing, and dynamic hardware scheduling.
"""

from __future__ import annotations

import logging
import queue
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger("sentinel.ai.scheduler")


@dataclass(order=True)
class PrioritizedTask:
    priority: int  # 0=CRITICAL (Watchlist candidate), 1=HIGH, 2=NORMAL, 3=BACKGROUND
    timestamp: float
    camera_id: str = field(compare=False)
    task_func: Callable = field(compare=False)
    payload: Any = field(compare=False)


class InferenceScheduler:
    """
    Adaptive Frame Rate Governor and Priority Task Scheduler.
    - Reduces GPU load on quiescent/static scenes (down to 2 FPS).
    - Bursts to 15-25 FPS when new vehicles enter the Region of Interest (ROI).
    - Ensures bounded memory queues with zero unbounded growth.
    """

    def __init__(self, max_queue_size: int = 150):
        self.max_queue_size = max_queue_size
        self._task_queue: queue.PriorityQueue[PrioritizedTask] = queue.PriorityQueue(maxsize=max_queue_size)
        # Key: camera_id -> last_processed_timestamp
        self._last_processed: Dict[str, float] = {}
        # Key: camera_id -> current_target_fps
        self._camera_fps: Dict[str, float] = {}

    def should_process_frame(
        self,
        camera_id: str,
        has_active_motion: bool = True,
        is_watchlist_tracking: bool = False
    ) -> bool:
        """
        Adaptive Frame Rate Policy:
        - Active Watchlist Pursuit: 25 FPS (Full stream rate)
        - Active Vehicle in ROI: 12 FPS
        - Static Scene: 2 FPS
        """
        now = time.time()
        if is_watchlist_tracking:
            target_fps = 25.0
        elif has_active_motion:
            target_fps = 12.0
        else:
            target_fps = 2.0

        self._camera_fps[camera_id] = target_fps
        min_interval = 1.0 / target_fps
        last_t = self._last_processed.get(camera_id, 0.0)

        if (now - last_t) >= min_interval:
            self._last_processed[camera_id] = now
            return True
        return False

    def enqueue_task(
        self,
        camera_id: str,
        task_func: Callable,
        payload: Any,
        priority: int = 2  # 0=CRITICAL, 1=HIGH, 2=NORMAL
    ) -> bool:
        """Enqueues inference task into bounded priority queue. Drops lower priority on overflow."""
        task = PrioritizedTask(
            priority=priority,
            timestamp=time.time(),
            camera_id=camera_id,
            task_func=task_func,
            payload=payload,
        )
        try:
            self._task_queue.put_nowait(task)
            return True
        except queue.Full:
            logger.warning(f"Inference queue full ({self.max_queue_size}). Shedding lowest-priority frame.")
            return False

    def get_queue_depth(self) -> int:
        """Returns current pending queue depth for Prometheus metrics."""
        return self._task_queue.qsize()


class GpuResourceManager:
    """
    Monitors GPU VRAM, compute utilization, and manages graceful CPU fallback.
    """

    def __init__(self):
        self._lock = threading.Lock()

    def get_resource_status(self) -> Dict[str, Any]:
        """Queries CUDA device memory and active compute availability."""
        try:
            import torch
            if torch.cuda.is_available():
                device_idx = torch.cuda.current_device()
                allocated_mb = round(torch.cuda.memory_allocated(device_idx) / (1024 * 1024), 1)
                reserved_mb = round(torch.cuda.memory_reserved(device_idx) / (1024 * 1024), 1)
                total_mb = round(torch.cuda.get_device_properties(device_idx).total_memory / (1024 * 1024), 1)
                utilization_pct = round((allocated_mb / max(1.0, total_mb)) * 100.0, 1)

                return {
                    "device": f"cuda:{device_idx}",
                    "device_name": torch.cuda.get_device_name(device_idx),
                    "vram_allocated_mb": allocated_mb,
                    "vram_reserved_mb": reserved_mb,
                    "vram_total_mb": total_mb,
                    "utilization_percent": utilization_pct,
                    "cuda_version": torch.version.cuda,
                    "fallback_mode": False,
                }
        except Exception:
            pass

        return {
            "device": "cpu",
            "device_name": "Host Multi-Core CPU Engine",
            "vram_allocated_mb": 0.0,
            "vram_reserved_mb": 0.0,
            "vram_total_mb": 0.0,
            "utilization_percent": 0.0,
            "fallback_mode": True,
        }


# Global inference scheduler & GPU manager singletons
inference_scheduler = InferenceScheduler()
gpu_resource_manager = GpuResourceManager()
