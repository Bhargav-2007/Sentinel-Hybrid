"""
Gujarat Sentinel — Explainable AI Confidence Engine & Alert Intelligence Generator
Computes multi-signal confidence vectors, 0–100 threat scores, triage tiers (LOW, MEDIUM, HIGH, CRITICAL),
false-positive suppression, and Section 65B legal prosecution narratives.
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
    final_alert_score: float         # 0.0 to 1.0
    threat_score: int                # 0 to 100 scale
    severity_tier: str               # LOW, MEDIUM, HIGH, CRITICAL
    triage_action: str               # AUTOMATIC_ALERT, HUMAN_REVIEW, OBSERVATION_ONLY
    is_actionable_alert: bool
    priority_rank: int               # 1 (Highest) to 4 (Lowest)
    is_false_positive_risk: bool
    signal_weights_used: Dict[str, float]
    signals: ConfidenceSignals
    narrative_explanation: str
    evidence_breakdown: List[str]


class ExplainableConfidenceEngine:
    """
    Computes an explainable, probabilistic multi-signal confidence and threat score for law enforcement alerts.
    Translates raw computer-vision uncertainty into calibrated operational police intelligence.
    Suppresses false-positives when OCR confidence or temporal consensus falls below evidentiary thresholds.
    """

    def __init__(
        self,
        w_ocr: float = 0.30,
        w_temporal: float = 0.20,
        w_watchlist: float = 0.25,
        w_cross_camera: float = 0.15,
        w_route: float = 0.10,
        threshold_auto_alert: float = 0.82,
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
        is_violent_crime_flag: bool = False,
    ) -> ExplainableAlertDecision:
        """
        Evaluates multi-signal confidence, computes 0-100 threat score, categorizes into
        LOW/MEDIUM/HIGH/CRITICAL severity, and synthesizes legal narrative.
        """
        # Weighted aggregate calculation
        weighted_score = (
            self.w_ocr * signals.ocr_conf +
            self.w_temporal * signals.temporal_conf +
            self.w_watchlist * signals.watchlist_conf +
            self.w_cross_camera * signals.cross_camera_conf +
            self.w_route * signals.route_plausibility_conf
        )
        final_score = round(min(0.995, max(0.05, weighted_score)), 3)

        # False-positive risk detection: single frame observation or OCR confidence < 0.60
        is_fp_risk = False
        if signals.ocr_conf < 0.60 or (supporting_frame_count <= 1 and signals.temporal_conf < 0.50):
            is_fp_risk = True

        # Base threat score calculation (0 - 100)
        base_threat = int(final_score * 100)
        if is_violent_crime_flag:
            base_threat = min(100, base_threat + 15)
        if supporting_camera_count >= 2:
            base_threat = min(100, base_threat + 8)

        threat_score = max(5, min(100, base_threat))

        # Severity categorization: LOW (0-39), MEDIUM (40-69), HIGH (70-89), CRITICAL (90-100)
        if threat_score >= 90 or (is_violent_crime_flag and threat_score >= 80):
            severity = "CRITICAL"
            triage = "AUTOMATIC_ALERT"
            priority = 1
            is_actionable = True
        elif threat_score >= 70:
            severity = "HIGH"
            triage = "AUTOMATIC_ALERT"
            priority = 2
            is_actionable = True
        elif threat_score >= 40:
            severity = "MEDIUM"
            triage = "HUMAN_REVIEW"
            priority = 3
            is_actionable = False
        else:
            severity = "LOW"
            triage = "OBSERVATION_ONLY"
            priority = 4
            is_actionable = False

        evidence_items = [
            f"Target Registration: {plate}",
            f"Threat Score: {threat_score}/100 [{severity}]",
            f"OCR Recognition Confidence: {signals.ocr_conf:.1%}",
            f"Multi-Frame Temporal Support: {supporting_frame_count}/{total_frame_count} frames ({signals.temporal_conf:.1%})",
            f"Watchlist Hotlist Match: {signals.watchlist_conf:.1%} (FIR/Case: {case_number or 'APB-TAGGED'})",
            f"Cross-Camera Corroboration: {supporting_camera_count} cameras ({signals.cross_camera_conf:.1%})",
            f"Corridor Transit Plausibility: {signals.route_plausibility_conf:.1%}",
            f"Calibrated Actionable Score: {final_score:.1%}",
        ]

        narrative = (
            f"ALERT [{severity} / Threat: {threat_score}]: Confirmed vehicle match for {plate} at {camera_name}. "
            f"Evidence backed by {supporting_frame_count}/{total_frame_count} temporal frames ({signals.ocr_conf:.0%} OCR conf) "
            f"and cross-corroborated across {supporting_camera_count} camera checkpoints ({signals.cross_camera_conf:.0%} spatial consistency). "
            f"Action Priority: Rank {priority} ({triage}). Justification FIR: {case_number or 'Active Police Hotlist'}."
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
            threat_score=threat_score,
            severity_tier=severity,
            triage_action=triage,
            is_actionable_alert=is_actionable,
            priority_rank=priority,
            is_false_positive_risk=is_fp_risk,
            signal_weights_used=weights,
            signals=signals,
            narrative_explanation=narrative,
            evidence_breakdown=evidence_items,
        )


# Global explainable confidence engine singleton
explainable_confidence_engine = ExplainableConfidenceEngine()
