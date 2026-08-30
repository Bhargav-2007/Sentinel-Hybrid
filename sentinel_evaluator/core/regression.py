"""
Regression Detection & Historical Comparison Engine for Sentinel Evaluator.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class RequirementTransition:
    req_id: str
    title: str
    previous_status: str
    current_status: str
    previous_score: float
    current_score: float
    is_regression: bool
    is_improvement: bool


@dataclass
class PerformanceDiff:
    metric_name: str
    previous_value: float
    current_value: float
    unit: str
    pct_change: float
    is_regression: bool


@dataclass
class EvaluationDiffResult:
    has_regressions: bool
    has_improvements: bool
    mandatory_score_diff: float
    bonus_score_diff: float
    total_score_diff: float
    regressions: List[str] = field(default_factory=list)
    improvements: List[str] = field(default_factory=list)
    preserved_components: List[str] = field(default_factory=list)
    requirement_transitions: List[RequirementTransition] = field(default_factory=list)
    performance_diffs: List[PerformanceDiff] = field(default_factory=list)
    what_changed_summary: List[str] = field(default_factory=list)


class RegressionDetector:
    """Detects score changes, state regressions, improvements, and performance shifts against previous runs."""

    def compare(
        self,
        current_report: Dict[str, Any],
        previous_report: Optional[Dict[str, Any]],
    ) -> EvaluationDiffResult:
        """Compares current evaluation run against prior report."""
        if not previous_report:
            return EvaluationDiffResult(
                has_regressions=False,
                has_improvements=True,
                mandatory_score_diff=0.0,
                bonus_score_diff=0.0,
                total_score_diff=0.0,
                improvements=["Initial baseline evaluation established."],
                what_changed_summary=["Initial baseline run established for Gujarat Sentinel Hybrid Platform."],
            )

        cur_summary = current_report.get("summary", {})
        prev_summary = previous_report.get("summary", {})

        m_diff = round(cur_summary.get("mandatory_score", 0.0) - prev_summary.get("mandatory_score", 0.0), 2)
        b_diff = round(cur_summary.get("bonus_score", 0.0) - prev_summary.get("bonus_score", 0.0), 2)
        t_diff = round(cur_summary.get("total_score", 0.0) - prev_summary.get("total_score", 0.0), 2)

        regressions: List[str] = []
        improvements: List[str] = []
        preserved: List[str] = []
        transitions: List[RequirementTransition] = []
        what_changed: List[str] = []

        # Compare requirement results
        prev_req_map = {r["id"]: r for r in previous_report.get("requirements", [])}
        cur_req_map = {r["id"]: r for r in current_report.get("requirements", [])}

        status_weights = {"FAIL": 0, "PARTIAL": 1, "EXTERNAL_DEPENDENCY": 2, "PASS": 3}

        for r_id, cur_r in cur_req_map.items():
            prev_r = prev_req_map.get(r_id)
            if not prev_r:
                improvements.append(f"New requirement verified: [{r_id}] {cur_r.get('title')}")
                what_changed.append(f"+ Added requirement evaluation for [{r_id}]")
                continue

            c_stat = cur_r.get("status", "FAIL")
            p_stat = prev_r.get("status", "FAIL")
            c_score = cur_r.get("score", 0.0)
            p_score = prev_r.get("score", 0.0)

            c_weight = status_weights.get(c_stat, 0)
            p_weight = status_weights.get(p_stat, 0)

            is_reg = c_weight < p_weight or (c_score < p_score - 5.0)
            is_imp = c_weight > p_weight or (c_score > p_score + 5.0)

            if is_reg:
                reg_msg = f"REGRESSION in [{r_id}] {cur_r.get('title')}: {p_stat} ({p_score}%) -> {c_stat} ({c_score}%)"
                regressions.append(reg_msg)
                what_changed.append(f"- Regressed [{r_id}]: {p_stat} -> {c_stat}")
            elif is_imp:
                imp_msg = f"IMPROVEMENT in [{r_id}] {cur_r.get('title')}: {p_stat} ({p_score}%) -> {c_stat} ({c_score}%)"
                improvements.append(imp_msg)
                what_changed.append(f"+ Improved [{r_id}]: {p_stat} -> {c_stat}")
            else:
                if c_stat == "PASS":
                    preserved.append(f"[{r_id}] {cur_r.get('title')} (Status: PASS — Intentionally preserved)")

            transitions.append(
                RequirementTransition(
                    req_id=r_id,
                    title=cur_r.get("title", ""),
                    previous_status=p_stat,
                    current_status=c_stat,
                    previous_score=p_score,
                    current_score=c_score,
                    is_regression=is_reg,
                    is_improvement=is_imp,
                )
            )

        # Performance comparisons
        perf_diffs: List[PerformanceDiff] = []
        cur_perf = current_report.get("performance_metrics", {})
        prev_perf = previous_report.get("performance_metrics", {})

        for m_name, c_val in cur_perf.items():
            if m_name in prev_perf:
                p_val = prev_perf[m_name]
                if p_val > 0:
                    pct = round(((c_val - p_val) / p_val) * 100.0, 1)
                    # For latency, increase is regression; for FPS/throughput, decrease is regression
                    is_latency = "latency" in m_name or "time" in m_name
                    is_p_reg = (pct > 15.0) if is_latency else (pct < -15.0)

                    if is_p_reg:
                        regressions.append(f"Performance regression on {m_name}: {p_val} -> {c_val} ({pct:+.1f}%)")
                    elif (pct < -15.0 if is_latency else pct > 15.0):
                        improvements.append(f"Performance improvement on {m_name}: {p_val} -> {c_val} ({pct:+.1f}%)")

                    perf_diffs.append(
                        PerformanceDiff(
                            metric_name=m_name,
                            previous_value=p_val,
                            current_value=c_val,
                            unit="ms" if is_latency else "fps",
                            pct_change=pct,
                            is_regression=is_p_reg,
                        )
                    )

        if not what_changed:
            what_changed.append("No material requirement or scoring changes detected since last evaluation.")

        return EvaluationDiffResult(
            has_regressions=bool(regressions),
            has_improvements=bool(improvements),
            mandatory_score_diff=m_diff,
            bonus_score_diff=b_diff,
            total_score_diff=t_diff,
            regressions=regressions,
            improvements=improvements,
            preserved_components=preserved,
            requirement_transitions=transitions,
            performance_diffs=perf_diffs,
            what_changed_summary=what_changed,
        )


# Singleton detector instance
regression_detector = RegressionDetector()
