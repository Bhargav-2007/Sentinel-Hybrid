"""Hardware device discovery and acceleration manager (CUDA / MPS / CPU)."""

import logging

logger = logging.getLogger("sentinel.ai.device")


def get_optimal_device(requested_device: str = "auto") -> str:
    """
    Determines the best available compute device for YOLO and OCR inference:
    1. NVIDIA CUDA GPU (if available)
    2. Apple Silicon MPS (if available)
    3. CPU fallback
    """
    if requested_device and requested_device != "auto":
        return requested_device

    try:
        import torch
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            logger.info(f"✓ CUDA GPU Acceleration enabled: {device_name}")
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("✓ Apple Silicon MPS Acceleration enabled.")
            return "mps"
    except Exception as e:
        logger.debug(f"Device discovery notice: {e}")

    logger.info("ℹ Utilizing CPU compute for inference.")
    return "cpu"


def get_gpu_info() -> dict:
    """Returns detailed GPU hardware status."""
    try:
        import torch
        if torch.cuda.is_available():
            return {
                "gpu_available": True,
                "device_name": torch.cuda.get_device_name(0),
                "device_count": torch.cuda.device_count(),
                "memory_allocated_mb": round(torch.cuda.memory_allocated(0) / (1024 ** 2), 2),
                "memory_reserved_mb": round(torch.cuda.memory_reserved(0) / (1024 ** 2), 2),
            }
    except Exception:
        pass

    return {
        "gpu_available": False,
        "device_name": None,
        "device_count": 0,
        "memory_allocated_mb": 0,
        "memory_reserved_mb": 0,
    }
