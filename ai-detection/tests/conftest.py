import os
import sys
from pathlib import Path

# Ensure ai-detection root directory is in sys.path
ai_detection_root = str(Path(__file__).resolve().parent.parent)
if ai_detection_root not in sys.path:
    sys.path.insert(0, ai_detection_root)
