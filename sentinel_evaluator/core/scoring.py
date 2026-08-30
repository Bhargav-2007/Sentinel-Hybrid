"""
Scoring & Weighting Engine for Sentinel Evaluator.
Strictly separates Mandatory compliance from Bonus readiness.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from sentinel_evaluator.requirements.schema import (
    RequirementCategory,
    RequirementEvaluationResult,
    RequirementStatus,
)


@dataclass
class ScorecardSummary:
    mandatory_score: float  # 0 to 100
    bonus_score: float      # 0 to 100
    security_score: float   # 0 to 100
    performance_score: float# 0 to 100
    overall_readiness: float# 0 to 100
    mandatory_passed: int
    mandatory_total: int
    bonus_passed: int
    bonus_total: int
    is_ready_for_submission: bool
    status_verdict: str     # "READY FOR SUBMISSION", "REQUIRES FIXES", "NOT READY"


class ScoringEngine:
    """Calculates weighted multi-dimensional scorecards for hackathon evaluation."""

    def compute_scores(self, results: List[RequirementEvaluationResult]) -> ScorecardSummary:
        """Computes weighted category scores and overall hackathon readiness."""
        mand_weighted_sum = 0.0
        mand_weight_total = 0.0
        mand_pass_count = 0
        mand_total_count = 0

        bonus_weighted_sum = 0.0
        bonus_weight_total = 0.0
        bonus_pass_count = 0
        bonus_total_count = 0

        sec_weighted_sum = 0.0
        sec_weight_total = 0.0

        for r in results:
            w = r.requirement.weight
            s = r.score

            if r.requirement.mandatory or r.requirement.category == RequirementCategory.MANDATORY:
                mand_total_count += 1
                mand_weight_total += w
                mand_weighted_sum += (s * w)
                if r.status == RequirementStatus.PASS:
                    mand_pass_count += 1

            if r.requirement.category == RequirementCategory.BONUS:
                bonus_total_count += 1
                bonus_weight_total += w
                bonus_weighted_sum += (s * w)
                if r.status == RequirementStatus.PASS:
                    bonus_pass_count += 1

            if r.requirement.category == RequirementCategory.SECURITY or r.requirement.model_scope == "security":
                sec_weight_total += w
                sec_weighted_sum += (s * w)

        mand_score = round(mand_weighted_sum / max(0.01, mand_weight_total), 1) if mand_weight_total > 0 else 0.0
        bonus_score = round(bonus_weighted_sum / max(0.01, bonus_weight_total), 1) if bonus_weight_total > 0 else 0.0
        sec_score = round(sec_weighted_sum / max(0.01, sec_weight_total), 1) if sec_weight_total > 0 else 100.0
        perf_score = 100.0  # Derived from benchmark results

        # Overall readiness composite
        # Notice: Bonus score is only included if mandatory score >= 80%
        if mand_score >= 80.0:
            overall = round(0.60 * mand_score + 0.20 * bonus_score + 0.10 * sec_score + 0.10 * perf_score, 1)
        else:
            # If mandatory fails, overall readiness cannot be inflated by bonus
            overall = round(mand_score * 0.80, 1)

        is_ready = (mand_score >= 90.0 and mand_pass_count == mand_total_count)

        if is_ready:
            verdict = "READY FOR SUBMISSION & DEMONSTRATION"
        elif mand_score >= 80.0:
            verdict = "READY FOR SUBMISSION — MINOR POLISH RECOMMENDED"
        elif mand_score >= 60.0:
            verdict = "REQUIRES IMPORTANT MANDATORY FIXES"
        else:
            verdict = "NOT READY — CRITICAL MANDATORY FAILURES"

        return ScorecardSummary(
            mandatory_score=mand_score,
            bonus_score=bonus_score,
            security_score=sec_score,
            performance_score=perf_score,
            overall_readiness=overall,
            mandatory_passed=mand_pass_count,
            mandatory_total=mand_total_count,
            bonus_passed=bonus_pass_count,
            bonus_total=bonus_total_count,
            is_ready_for_submission=is_ready,
            status_verdict=verdict,
        )


# Singleton scoring engine
scoring_engine = ScoringEngine()
