"""
Gujarat Sentinel — Multi-Frame Temporal OCR Fusion Engine
Aggregates successive OCR plate hypotheses across video frames for a persistent track.
Uses character-level voting, confidence weighting, and Levenshtein similarity.
"""

from __future__ import annotations

import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# Regex patterns for Indian Registration Numbers: Standard HSRP, Bharat (BH) Series, Diplomatic
INDIAN_PLATE_PATTERN = re.compile(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{4})$")
BHARAT_SERIES_PATTERN = re.compile(r"^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$")
DIPLOMATIC_PLATE_PATTERN = re.compile(r"^([0-9]{1,3})(CD|CC|UN)([0-9]{1,4})$")

# Common OCR confusion character replacements conditioned on character position
NUMERIC_CHARS = set("0123456789")
ALPHA_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
CHAR_TO_NUM = {"O": "0", "I": "1", "Z": "2", "S": "5", "B": "8", "G": "6", "Q": "0", "D": "0", "A": "4"}
NUM_TO_CHAR = {"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "6": "G", "4": "A"}


@dataclass
class PlateObservation:
    """Individual single-frame plate observation."""
    raw_text: str
    clean_plate: str
    confidence: float
    timestamp: float
    pts_ms: Optional[int] = None
    bbox_area: float = 0.0


@dataclass
class FusedPlateResult:
    """Consolidated multi-frame temporal plate hypothesis."""
    plate_number: str
    formatted_plate: str
    aggregate_confidence: float
    supporting_frames: int
    total_frames_evaluated: int
    support_ratio: float
    is_valid_indian_format: bool
    state_code: str
    rto_code: str
    character_confidences: List[float]
    first_seen_timestamp: float
    last_seen_timestamp: float
    history: List[str] = field(default_factory=list)


def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


class TemporalOCRFusion:
    """
    Temporal OCR Multi-Frame Fusion Engine.
    Accumulates plate observations across successive video frames for a persistent ByteTrack ID.
    Applies position-aware character voting and confidence weighting to resolve plate ambiguity.
    """

    def __init__(
        self,
        max_history_seconds: float = 8.0,
        max_frames_per_track: int = 15,
        min_supporting_frames: int = 2,
    ):
        self.max_history_seconds = max_history_seconds
        self.max_frames_per_track = max_frames_per_track
        self.min_supporting_frames = min_supporting_frames
        # Key: (camera_id, track_id) -> List[PlateObservation]
        self._track_observations: Dict[Tuple[str, int], List[PlateObservation]] = defaultdict(list)

    def add_observation(
        self,
        camera_id: str,
        track_id: int,
        raw_text: str,
        clean_plate: str,
        confidence: float,
        pts_ms: Optional[int] = None,
        bbox_area: float = 0.0,
    ) -> FusedPlateResult:
        """
        Adds a new frame observation and computes the updated fused hypothesis for the vehicle track.
        """
        now = time.time()
        key = (camera_id, track_id)
        
        # Prune old observations outside time window
        self._track_observations[key] = [
            obs for obs in self._track_observations[key]
            if (now - obs.timestamp) <= self.max_history_seconds
        ]

        # Append new observation
        new_obs = PlateObservation(
            raw_text=raw_text,
            clean_plate=clean_plate.strip().upper(),
            confidence=max(0.1, min(1.0, confidence)),
            timestamp=now,
            pts_ms=pts_ms,
            bbox_area=bbox_area,
        )
        self._track_observations[key].append(new_obs)

        # Cap history length
        if len(self._track_observations[key]) > self.max_frames_per_track:
            self._track_observations[key] = self._track_observations[key][-self.max_frames_per_track:]

        # Run fusion algorithm
        return self._fuse_observations(self._track_observations[key])

    def _fuse_observations(self, observations: List[PlateObservation]) -> FusedPlateResult:
        """
        Executes multi-frame fusion using character-level voting matrix and length normalization.
        """
        if not observations:
            return FusedPlateResult(
                plate_number="UNKNOWN",
                formatted_plate="UNKNOWN",
                aggregate_confidence=0.0,
                supporting_frames=0,
                total_frames_evaluated=0,
                support_ratio=0.0,
                is_valid_indian_format=False,
                state_code="",
                rto_code="",
                character_confidences=[],
                first_seen_timestamp=time.time(),
                last_seen_timestamp=time.time(),
                history=[],
            )

        if len(observations) == 1:
            obs = observations[0]
            m = INDIAN_PLATE_PATTERN.match(obs.clean_plate)
            is_valid = bool(m)
            state = m.group(1) if m else (obs.clean_plate[:2] if len(obs.clean_plate) >= 2 else "")
            rto = m.group(2) if m else (obs.clean_plate[2:4] if len(obs.clean_plate) >= 4 else "")
            formatted = f"{state} {rto} {obs.clean_plate[4:-4]} {obs.clean_plate[-4:]}".strip() if len(obs.clean_plate) >= 8 else obs.clean_plate
            return FusedPlateResult(
                plate_number=obs.clean_plate,
                formatted_plate=formatted,
                aggregate_confidence=obs.confidence,
                supporting_frames=1,
                total_frames_evaluated=1,
                support_ratio=1.0,
                is_valid_indian_format=is_valid,
                state_code=state,
                rto_code=rto,
                character_confidences=[obs.confidence] * len(obs.clean_plate),
                first_seen_timestamp=obs.timestamp,
                last_seen_timestamp=obs.timestamp,
                history=[obs.clean_plate],
            )

        # 1. Determine dominant plate length
        lengths = defaultdict(float)
        for obs in observations:
            if len(obs.clean_plate) >= 6:
                lengths[len(obs.clean_plate)] += obs.confidence
        
        target_len = max(lengths.keys(), key=lambda l: lengths[l]) if lengths else 10

        # Filter observations matching or close to target length
        candidate_obs = [obs for obs in observations if abs(len(obs.clean_plate) - target_len) <= 1]
        if not candidate_obs:
            candidate_obs = observations

        # 2. Build character-level voting matrix: position -> character -> weighted_score
        char_matrix: List[Dict[str, float]] = [defaultdict(float) for _ in range(target_len)]
        
        for obs in candidate_obs:
            plate_str = obs.clean_plate
            # Align string to target length
            if len(plate_str) < target_len:
                plate_str = plate_str.ljust(target_len, "X")
            elif len(plate_str) > target_len:
                plate_str = plate_str[:target_len]

            for pos, char in enumerate(plate_str):
                # Apply domain-specific character constraints for Indian HSRP plates
                # Pos 0, 1: State code -> Must be letters (e.g. GJ, MH, DL)
                if pos in (0, 1) and char in CHAR_TO_NUM:
                    char = NUM_TO_CHAR.get(char, char)
                # Pos 2, 3: RTO code -> Must be digits (e.g. 01, 05, 12)
                elif pos in (2, 3) and char in NUM_TO_CHAR and target_len >= 9:
                    char = CHAR_TO_NUM.get(char, char)
                # Last 4 positions: Vehicle registration number -> Must be digits
                elif pos >= target_len - 4 and char in NUM_TO_CHAR:
                    char = CHAR_TO_NUM.get(char, char)

                char_matrix[pos][char] += obs.confidence

        # 3. Construct consensus plate string
        consensus_chars = []
        char_confs = []
        for pos in range(target_len):
            scores = char_matrix[pos]
            if scores:
                best_char = max(scores.keys(), key=lambda c: scores[c])
                total_pos_weight = sum(scores.values())
                best_conf = scores[best_char] / total_pos_weight if total_pos_weight > 0 else 0.5
                consensus_chars.append(best_char)
                char_confs.append(round(best_conf, 3))
            else:
                consensus_chars.append("X")
                char_confs.append(0.1)

        fused_plate = "".join(consensus_chars)

        # 4. Calculate frame support ratio using Levenshtein distance <= 1
        supporting_count = sum(1 for obs in observations if levenshtein_distance(obs.clean_plate, fused_plate) <= 1)
        total_count = len(observations)
        support_ratio = round(supporting_count / total_count, 3)

        # Mean character confidence weighted by support ratio
        base_conf = float(sum(char_confs) / len(char_confs)) if char_confs else 0.5
        agg_conf = min(0.995, round(base_conf * 0.7 + support_ratio * 0.3, 3))

        # 5. Format and validate Indian plate
        m = INDIAN_PLATE_PATTERN.match(fused_plate)
        is_valid = bool(m)
        state = m.group(1) if m else (fused_plate[:2] if len(fused_plate) >= 2 else "")
        rto = m.group(2) if m else (fused_plate[2:4] if len(fused_plate) >= 4 else "")
        
        if is_valid and m:
            s_code, r_code, series, num = m.groups()
            formatted = f"{s_code} {r_code} {series} {num}".replace("  ", " ").strip()
        elif len(fused_plate) >= 8:
            formatted = f"{fused_plate[:2]} {fused_plate[2:4]} {fused_plate[4:-4]} {fused_plate[-4:]}".strip()
        else:
            formatted = fused_plate

        history_plates = [o.clean_plate for o in observations]

        return FusedPlateResult(
            plate_number=fused_plate,
            formatted_plate=formatted,
            aggregate_confidence=agg_conf,
            supporting_frames=supporting_count,
            total_frames_evaluated=total_count,
            support_ratio=support_ratio,
            is_valid_indian_format=is_valid,
            state_code=state,
            rto_code=rto,
            character_confidences=char_confs,
            first_seen_timestamp=observations[0].timestamp,
            last_seen_timestamp=observations[-1].timestamp,
            history=history_plates,
        )

    def clear_track(self, camera_id: str, track_id: int) -> None:
        """Cleans up cached observations when a track leaves the field of view."""
        self._track_observations.pop((camera_id, track_id), None)


# Global temporal fusion singleton
temporal_ocr_fusion = TemporalOCRFusion()
