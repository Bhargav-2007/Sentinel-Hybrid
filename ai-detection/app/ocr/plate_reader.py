"""License Plate OCR Reader using PaddleOCR / EasyOCR with Indian HSRP normalization."""

import logging
import re
from typing import Optional, Tuple
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from app.config import settings
from app.schemas import LicensePlateDetection, BoundingBox
from app.utils.drawing import frame_to_base64

logger = logging.getLogger("sentinel.ai.ocr")

# Regex patterns for Indian Vehicle Number Plate Formats conforming to MoRTH / CMVR rules
INDIAN_STATE_HSRP_PATTERN = re.compile(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{4})$")
BHARAT_SERIES_PATTERN = re.compile(r"^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$")
DIPLOMATIC_PLATE_PATTERN = re.compile(r"^([0-9]{1,3})(CD|CC|UN)([0-9]{1,4})$")
DEFENSE_PLATE_PATTERN = re.compile(r"^([0-9]{2})([A-Z])([0-9]{5,6})([A-Z]?)$")

# Valid 2-letter State & UT Codes in India
INDIAN_STATE_CODES = {
    "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ", "HP", "HR",
    "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL", "OD",
    "PB", "PY", "RJ", "SK", "TN", "TR", "TS", "UK", "UP", "WB"
}

# Character correction maps for OCR confusion based on position
CHAR_TO_NUM = {"O": "0", "I": "1", "Z": "2", "S": "5", "B": "8", "G": "6", "Q": "0", "D": "0", "A": "4"}
NUM_TO_CHAR = {"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "6": "G", "4": "A"}


class PlateReader:
    """
    Automatic Number Plate Recognition (ANPR) OCR Engine.
    Leverages PaddleOCR / EasyOCR with domain-specific heuristics for Indian High Security Registration Plates (HSRP),
    Bharat (BH) Series, Diplomatic, and State Transport registrations.
    """

    def __init__(self):
        self.engine_type = settings.OCR_ENGINE.lower()
        self.ocr = None
        self._init_ocr()

    def _init_ocr(self) -> None:
        """Initializes PaddleOCR or EasyOCR engine."""
        if self.engine_type == "paddleocr":
            try:
                from paddleocr import PaddleOCR
                self.ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
                logger.info("✓ Initialized PaddleOCR engine.")
                return
            except Exception as e:
                logger.debug(f"PaddleOCR not available ({e}), trying EasyOCR...")

        try:
            import easyocr
            self.ocr = easyocr.Reader(settings.OCR_LANGUAGES, gpu=False)
            logger.info("✓ Initialized EasyOCR engine.")
        except Exception as e:
            logger.warning(f"Native OCR engines not initialized: {e}. Running in heuristic fallback mode.")
            self.ocr = None

    def _enhance_plate_image(self, plate_crop: np.ndarray) -> np.ndarray:
        """Applies multi-stage image enhancement (CLAHE + Bilateral filtering + Upscaling) for OCR."""
        if cv2 is None or plate_crop is None or plate_crop.size == 0:
            return plate_crop

        h, w = plate_crop.shape[:2]
        target = plate_crop

        # 1. Upscale if plate resolution is low (< 240px wide)
        if w < 240 or h < 80:
            scale = max(240.0 / max(w, 1), 80.0 / max(h, 1), 2.0)
            target = cv2.resize(target, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization) on Luminance channel
        try:
            lab = cv2.cvtColor(target, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            cl = clahe.apply(l_channel)
            limg = cv2.merge((cl, a_channel, b_channel))
            enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
            # Bilateral filter to smooth noise while preserving character edges
            return cv2.bilateralFilter(enhanced, 7, 50, 50)
        except Exception:
            return target

    def read_plate(
        self,
        plate_crop: np.ndarray,
        bbox: BoundingBox,
        vehicle_track_id: Optional[int] = None,
        camera_id: Optional[str] = None,
    ) -> LicensePlateDetection:
        """
        Reads characters from cropped license plate image, applies regex normalization,
        and returns a structured LicensePlateDetection object.
        """
        raw_text = ""
        confidence = 0.95

        if plate_crop is not None and plate_crop.size > 0:
            enhanced_crop = self._enhance_plate_image(plate_crop)

            if self.ocr is not None:
                try:
                    # PaddleOCR inference
                    if hasattr(self.ocr, "ocr"):
                        result = self.ocr.ocr(enhanced_crop, cls=True)
                        if result and result[0]:
                            texts = [line[1][0] for line in result[0]]
                            confs = [line[1][1] for line in result[0]]
                            raw_text = " ".join(texts)
                            confidence = float(np.mean(confs)) if confs else 0.90
                    # EasyOCR inference
                    elif hasattr(self.ocr, "readtext"):
                        result = self.ocr.readtext(enhanced_crop)
                        if result:
                            texts = [item[1] for item in result]
                            confs = [item[2] for item in result]
                            raw_text = " ".join(texts)
                            confidence = float(np.mean(confs)) if confs else 0.90
                except Exception as e:
                    logger.error(f"OCR reading error: {e}")

        # If OCR did not detect text, return empty detection with 0.0 confidence
        if not raw_text.strip():
            return LicensePlateDetection(
                plate_number="",
                formatted_plate="",
                raw_ocr_text="",
                confidence=0.0,
                bbox=bbox,
                vehicle_track_id=vehicle_track_id,
                is_valid_indian_format=False,
                plate_crop_base64=frame_to_base64(plate_crop) if plate_crop is not None else None
            )

        # Normalize and clean plate string conforming to Indian RTO / Bharat Series standards
        clean_plate, formatted_plate, is_valid = self._clean_and_format_plate(raw_text)

        # Minimum alphanumeric length check to reject noise artifacts (e.g. single letters or symbols)
        if len(clean_plate) < 4:
            crop_b64 = frame_to_base64(plate_crop) if plate_crop is not None else None
            return LicensePlateDetection(
                plate_number="",
                formatted_plate="",
                raw_ocr_text=raw_text,
                confidence=0.0,
                bbox=bbox,
                vehicle_track_id=vehicle_track_id,
                is_valid_indian_format=False,
                plate_crop_base64=crop_b64
            )

        # Apply temporal fusion if persistent track ID is available
        if vehicle_track_id is not None and camera_id is not None:
            from app.ocr.temporal_fusion import temporal_ocr_fusion
            fused = temporal_ocr_fusion.add_observation(
                camera_id=camera_id,
                track_id=vehicle_track_id,
                raw_text=raw_text,
                clean_plate=clean_plate,
                confidence=confidence,
            )
            clean_plate = fused.plate_number
            formatted_plate = fused.formatted_plate
            confidence = fused.aggregate_confidence
            is_valid = fused.is_valid_indian_format

        # Generate base64 crop image for evidence
        crop_b64 = frame_to_base64(plate_crop) if plate_crop is not None else None

        return LicensePlateDetection(
            plate_number=clean_plate,
            formatted_plate=formatted_plate,
            raw_ocr_text=raw_text,
            confidence=round(confidence, 3),
            bbox=bbox,
            vehicle_track_id=vehicle_track_id,
            is_valid_indian_format=is_valid,
            plate_crop_base64=crop_b64
        )

    def _clean_and_format_plate(self, text: str) -> Tuple[str, str, bool]:
        """
        Cleans and normalizes alphanumeric string conforming to Indian RTO standards:
        - Standard State HSRP: 'GJ01XY1234' -> Formatted: 'GJ 01 XY 1234'
        - Bharat Series: '22BH1234AA' -> Formatted: '22 BH 1234 AA'
        - Diplomatic: '01CD1234' -> Formatted: '01 CD 1234'
        """
        # Remove whitespace, hyphens, dots, and common Indian country code 'IND'
        cleaned = re.sub(r"[^A-Za-z0-9]", "", text).upper()
        if cleaned.startswith("IND"):
            cleaned = cleaned[3:]

        if not cleaned:
            return "", "", False

        # Check 1: Bharat Series (e.g. 22BH1234AA or 21BH5678A)
        # Year of registration (2 digits) + BH + 4 numbers + 1-2 letters
        bh_candidate = cleaned
        if len(bh_candidate) >= 8 and ("BH" in bh_candidate[1:4]):
            # Correct first 2 characters to numbers
            y0 = CHAR_TO_NUM.get(bh_candidate[0], bh_candidate[0])
            y1 = CHAR_TO_NUM.get(bh_candidate[1], bh_candidate[1])
            bh_candidate = y0 + y1 + bh_candidate[2:]
            m_bh = BHARAT_SERIES_PATTERN.match(bh_candidate)
            if m_bh:
                year, num, series = m_bh.groups()
                return bh_candidate, f"{year} BH {num} {series}", True

        # Check 2: Diplomatic Corps (e.g. 77CD12 or 01CC1234)
        m_dip = DIPLOMATIC_PLATE_PATTERN.match(cleaned)
        if m_dip:
            embassy_code, corps_type, num = m_dip.groups()
            return cleaned, f"{embassy_code} {corps_type} {num}", True

        # Check 3: Standard State High Security Registration Plate (HSRP)
        # Position 0-1: State Code (Alpha)
        if len(cleaned) >= 2:
            s0 = NUM_TO_CHAR.get(cleaned[0], cleaned[0])
            s1 = NUM_TO_CHAR.get(cleaned[1], cleaned[1])
            # Special case for Gujarat 'GJ' common OCR substitution
            if (s0 + s1) in ("0J", "G1", "6J", "CJ", "OJ"):
                s0, s1 = "G", "J"
            cleaned = s0 + s1 + cleaned[2:]

        # Position 2-3: RTO District Code (Numeric)
        if len(cleaned) >= 4:
            r0 = CHAR_TO_NUM.get(cleaned[2], cleaned[2])
            r1 = CHAR_TO_NUM.get(cleaned[3], cleaned[3]) if len(cleaned) >= 4 else ""
            cleaned = cleaned[:2] + r0 + r1 + cleaned[4:]

        # Last 4 digits: Strictly numeric
        if len(cleaned) >= 8:
            prefix = cleaned[:-4]
            last_four = "".join(CHAR_TO_NUM.get(c, c) for c in cleaned[-4:])
            cleaned = prefix + last_four

        # Check standard state match
        m = INDIAN_STATE_HSRP_PATTERN.match(cleaned)
        if m:
            state, rto, series, num = m.groups()
            is_valid_state = state in INDIAN_STATE_CODES or len(state) == 2
            formatted = f"{state} {rto} {series} {num}".replace("  ", " ").strip()
            return cleaned, formatted, is_valid_state

        # Fallback formatting for non-standard length
        if len(cleaned) >= 8:
            formatted = f"{cleaned[:2]} {cleaned[2:4]} {cleaned[4:-4]} {cleaned[-4:]}".strip()
            return cleaned, formatted, False

        return cleaned, cleaned, False


# Global plate reader singleton
plate_reader = PlateReader()

