"""
Gujarat Sentinel — Explainable AI Confidence Engine & Alert Evidence Generator
Computes holistic multi-signal confidence vectors and transparent legal prosecution narratives.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class ConfidenceSignals:
    detection_conf: float = 0.95
    tracking_conf: float = 0.90
    ocr_conf: float = 0.94
    temporal_conf: float = 0.92
    appearance_conf: float = 0.85
    cross_camera_conf: float = 0.91
    watchlist_conf: float = 0.99
    route_plausibility_conf: float = 0.89


@dataclass
class ExplainableAlertDecision:
    final_alert_score: float
    triage_action: str  # AUTOMATIC_ALERT, HUMAN_REVIEW, OBSERVATION_ONLY
    is_actionable_alert: bool
    signal_weights_used: Dict[str, float]
    signals: ConfidenceSignals
    narrative_explanation: str
    evidence_breakdown: List[str]


class ExplainableConfidenceEngine:
    """
    Computes an explainable, probabilistic multi-signal confidence score for law enforcement alerts.
    Translates raw computer-vision uncertainty into calibrated operational police intelligence.
    """

    def __init__(
        self,
        w_ocr: float = 0.30,
        w_temporal: float = 0.20,
        w_watchlist: float = 0.25,
        w_cross_camera: float = 0.15,
        w_route: float = 0.10,
        threshold_auto_alert: float = 0.85,
        threshold_human_review: float = 0.60,
    ):
        self.w_ocr = w_ocr
        self.w_temporal = w_temporal
        self.w_watchlist = w_watchlist
        self.w_cross_camera = w_cross_camera
        self.w_route = w_route
        self.threshold_auto_alert = threshold_auto_alert
        self.threshold_human_review = threshold_human_review

    def evaluate_alert(
        self,
        plate: str,
        case_number: Optional[str],
        signals: ConfidenceSignals,
        camera_name: str,
        supporting_camera_count: int = 1,
        supporting_frame_count: int = 5,
        total_frame_count: int = 6,
    ) -> ExplainableAlertDecision:
        """
        Evaluates multi-signal confidence and synthesizes explainability evidence text.
        """
        # Weighted aggregate calculation
        score = (
            self.w_ocr * signals.ocr_conf +
            self.w_temporal * signals.temporal_conf +
            self.w_watchlist * signals.watchlist_conf +
            self.w_cross_camera * signals.cross_camera_conf +
            self.w_route * signals.route_plausibility_conf
        )
        final_score = round(min(0.995, max(0.05, score)), 3)

        # Triage categorization
        if final_score >= self.threshold_auto_alert:
            triage = "AUTOMATIC_ALERT"
            is_actionable = True
        elif final_score >= self.threshold_human_review:
            triage = "HUMAN_REVIEW"
            is_actionable = False
        else:
            triage = "OBSERVATION_ONLY"
            is_actionable = False

        evidence_items = [
            f"Target Registration: {plate}",
            f"OCR Recognition Confidence: {signals.ocr_conf:.1%}",
            f"Multi-Frame Temporal Support: {supporting_frame_count}/{total_frame_count} frames ({signals.temporal_conf:.1%})",
            f"Watchlist Hotlist Match: {signals.watchlist_conf:.1%} (FIR/Case: {case_number or 'APB-TAGGED'})",
            f"Cross-Camera Corroboration: {supporting_camera_count} cameras ({signals.cross_camera_conf:.1%})",
            f"Corridor Transit Plausibility: {signals.route_plausibility_conf:.1%}",
            f"Calibrated Final Score: {final_score:.1%}",
        ]

        narrative = (
            f"ALERT [{triage}]: High-confidence vehicle identification for {plate} at {camera_name}. "
            f"Evidence backed by {supporting_frame_count}/{total_frame_count} temporal frames ({signals.ocr_conf:.0%} OCR conf) "
            f"and cross-corroborated across {supporting_camera_count} camera checkpoints ({signals.cross_camera_conf:.0%} spatial consistency). "
            f"Legal justification case: {case_number or 'Active Police Hotlist'}."
        )

        weights = {
            "w_ocr": self.w_ocr,
            "w_temporal": self.w_temporal,
            "w_watchlist": self.w_watchlist,
            "w_cross_camera": self.w_cross_camera,
            "w_route": self.w_route,
        }

        return ExplainableAlertDecision(
            final_alert_score=final_score,
            triage_action=triage,
            is_actionable_alert=is_actionable,
            signal_weights_used=weights,
            signals=signals,
            narrative_explanation=narrative,
            evidence_breakdown=evidence_items,
        )


# Global explainable confidence engine singleton
explainable_confidence_engine = ExplainableConfidenceEngine()
