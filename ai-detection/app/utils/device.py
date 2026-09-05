"""Hardware device discovery and acceleration manager (CUDA / MPS / CPU)."""

import logging

logger = logging.getLogger("sentinel.ai.device")


def get_optimal_device(requested_device: str = "auto") -> str:
    """
    Determines the best available compute device for YOLO and OCR inference:
    1. NVIDIA CUDA GPU (if available and operational for the current architecture)
    2. Apple Silicon MPS (if available)
    3. CPU fallback
    """
    req = (requested_device or "auto").strip().lower()
    if req == "cpu":
        return "cpu"

    try:
        import torch
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            # Verify that kernel execution actually works for the current GPU architecture (e.g. sm_120 / RTX 5050)
            try:
                test_t = torch.zeros(1, device="cuda")
                _ = test_t + 1
                logger.info(f"✓ CUDA GPU Acceleration fully verified: {device_name}")
                return "cuda"
            except Exception as k_err:
                logger.warning(
                    f"CUDA GPU detected ({device_name}), but kernel execution requires specific architecture support ({k_err}). "
                    f"Utilizing high-performance CPU inference fallback."
                )
                return "cpu"
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
            device_name = torch.cuda.get_device_name(0)
            can_execute = False
            try:
                test_t = torch.zeros(1, device="cuda")
                _ = test_t + 1
                can_execute = True
            except Exception:
                pass

            return {
                "gpu_available": True,
                "gpu_operational": can_execute,
                "device_name": device_name,
                "device_count": torch.cuda.device_count(),
                "cuda_version": getattr(torch.version, "cuda", "12.4"),
                "capability": list(torch.cuda.get_device_capability(0)),
                "memory_allocated_mb": round(torch.cuda.memory_allocated(0) / (1024 ** 2), 2),
                "memory_reserved_mb": round(torch.cuda.memory_reserved(0) / (1024 ** 2), 2),
            }
    except Exception:
        pass

    return {
        "gpu_available": False,
        "gpu_operational": False,
        "device_name": None,
        "device_count": 0,
        "cuda_version": None,
        "capability": None,
        "memory_allocated_mb": 0,
        "memory_reserved_mb": 0,
    }
