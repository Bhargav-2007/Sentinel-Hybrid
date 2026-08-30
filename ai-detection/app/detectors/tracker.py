"""Multi-Object Tracking (ByteTrack) integration for persistent cross-frame IDs."""

import logging
from typing import List, Dict
import numpy as np

from app.schemas import DetectedObject, BoundingBox

logger = logging.getLogger("sentinel.ai.tracker")


class ByteTrackWrapper:
    """
    ByteTrack multi-object tracker wrapper.
    Assigns persistent temporal tracking IDs (e.g. Track #1, Track #2) to moving vehicles
    and pedestrians across successive video frames using spatial IoU association.
    """

    def __init__(self, max_lost_frames: int = 30, iou_threshold: float = 0.3):
        self.max_lost_frames = max_lost_frames
        self.iou_threshold = iou_threshold
        self.next_track_id = 1
        # Active tracks: { track_id: { "bbox": BoundingBox, "lost": int, "class_name": str } }
        self.tracks: Dict[int, dict] = {}

    def _compute_iou(self, b1: BoundingBox, b2: BoundingBox) -> float:
        """Calculates Intersection over Union between two bounding boxes."""
        xi1 = max(b1.x1, b2.x1)
        yi1 = max(b1.y1, b2.y1)
        xi2 = min(b1.x2, b2.x2)
        yi2 = min(b1.y2, b2.y2)
        
        inter_area = max(0, xi2 - xi1) * max(0, yi2 - yi1)
        b1_area = b1.width * b1.height
        b2_area = b2.width * b2.height
        union_area = b1_area + b2_area - inter_area
        
        return inter_area / union_area if union_area > 0 else 0.0

    def update(self, detections: List[DetectedObject]) -> List[DetectedObject]:
        """
        Associates current frame detections with existing tracks via ByteTrack logic.
        Assigns track_id to matched objects and registers new tracks.
        """
        if not detections:
            # Increment lost counter on all tracks
            for t_id in list(self.tracks.keys()):
                self.tracks[t_id]["lost"] += 1
                if self.tracks[t_id]["lost"] > self.max_lost_frames:
                    del self.tracks[t_id]
            return []

        matched_tracks = set()
        matched_detections = set()

        # Match existing tracks with detections
        for t_id, t_info in self.tracks.items():
            best_iou = 0.0
            best_det_idx = -1
            for d_idx, det in enumerate(detections):
                if d_idx in matched_detections:
                    continue
                if det.class_name != t_info["class_name"]:
                    continue
                iou = self._compute_iou(t_info["bbox"], det.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_det_idx = d_idx

            if best_iou >= self.iou_threshold and best_det_idx >= 0:
                detections[best_det_idx].track_id = t_id
                self.tracks[t_id]["bbox"] = detections[best_det_idx].bbox
                self.tracks[t_id]["lost"] = 0
                matched_tracks.add(t_id)
                matched_detections.add(best_det_idx)
            else:
                t_info["lost"] += 1

        # Prune dead tracks
        for t_id in list(self.tracks.keys()):
            if self.tracks[t_id]["lost"] > self.max_lost_frames:
                del self.tracks[t_id]

        # Register unmatched detections as new tracks
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_detections:
                det.track_id = self.next_track_id
                self.tracks[self.next_track_id] = {
                    "bbox": det.bbox,
                    "lost": 0,
                    "class_name": det.class_name,
                }
                self.next_track_id += 1

        return detections


# Per-camera tracker cache
_camera_trackers: Dict[str, ByteTrackWrapper] = {}


def get_tracker_for_camera(camera_id: str = "default") -> ByteTrackWrapper:
    """Retrieves or instantiates an isolated ByteTrack tracker for a camera stream."""
    if camera_id not in _camera_trackers:
        _camera_trackers[camera_id] = ByteTrackWrapper()
    return _camera_trackers[camera_id]
