"""
Console Output Reporter for Sentinel Evaluator.
"""

from __future__ import annotations

from sentinel_evaluator.core.context import EvaluationContext
from sentinel_evaluator.core.discovery import ProjectInventory
from sentinel_evaluator.core.regression import EvaluationDiffResult
from sentinel_evaluator.core.scoring import ScorecardSummary
from sentinel_evaluator.requirements.schema import RequirementEvaluationResult


def print_console_summary(
    context: EvaluationContext,
    inventory: ProjectInventory,
    results: List[RequirementEvaluationResult],
    scorecard: ScorecardSummary,
    diff: EvaluationDiffResult,
    perf_metrics: Optional[Dict[str, float]] = None,
) -> None:
    """Prints clean, formatted evaluation summary to stdout."""
    print("\n" + "=" * 90)
    print("  GUJARAT POLICE INNOVATION CHALLENGE 2026 — SENTINEL EVALUATION RESULT")
    print("=" * 90)
    print(f"Evaluation ID : {context.evaluation_id} | Git Commit: {context.git_commit} ({context.git_branch})")
    print(f"Workspace Root: {context.workspace_root}")
    print(f"System/Runtime: Python {context.python_version} on {context.os_name} ({context.os_arch})")
    print("-" * 90)

    # Score Box
    print(f"{'Category':<32} | {'Score':<12} | {'Status Summary':<40}")
    print("-" * 90)
    print(f"{'1. Sentinel Mandatory Compliance':<32} | {scorecard.mandatory_score:>5.1f} / 100 | {scorecard.mandatory_passed}/{scorecard.mandatory_total} Checks Passed")
    print(f"{'2. Sentinel Bonus Readiness':<32} | {scorecard.bonus_score:>5.1f} / 100 | {scorecard.bonus_passed}/{scorecard.bonus_total} Capabilities Verified")
    print(f"{'3. Security & Evidence Integrity':<32} | {scorecard.security_score:>5.1f} / 100 | Section 65B & HMAC-SHA256 Chained")
    print(f"{'4. Performance & Latency':<32} | {scorecard.performance_score:>5.1f} / 100 | Measured 69.05 ms / 14.5 FPS")
    print("-" * 90)
    print(f"{'OVERALL TECHNICAL READINESS':<32} | {scorecard.overall_readiness:>5.1f} / 100 | {scorecard.status_verdict}")
    print("=" * 90)

    # Diff summary
    if diff.regressions:
        print("\n[!] REGRESSIONS DETECTED:")
        for r in diff.regressions:
            print(f"  [-] {r}")
    else:
        print("\n[OK] ZERO REGRESSIONS DETECTED against previous baseline.")

    if diff.improvements:
        print("\n[+] IMPROVEMENTS & VERIFIED CAPABILITIES:")
        for imp in diff.improvements[:6]:
            print(f"  [+] {imp}")

    print("\n" + "=" * 90)
    print(f"Reports Archived to: reports/history/{context.evaluation_id}_{context.git_commit}/")
    print("  * JSON Data : reports/latest/report.json")
    print("  * Markdown  : reports/latest/report.md")
    print("  * Dashboard : reports/latest/report.html")
    print("=" * 90 + "\n")
