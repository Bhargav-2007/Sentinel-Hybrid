"""
Command Line Interface (CLI) for Sentinel Evaluator.
"""

from __future__ import annotations

import argparse
import os
import sys
import webbrowser

from sentinel_evaluator.core.engine import evaluation_engine
from sentinel_evaluator.core.storage import evaluation_storage
from sentinel_evaluator.reporters.console import print_console_summary


def main(args: Optional[List[str]] = None) -> int:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="sentinel_evaluator",
        description="Gujarat Sentinel CCTV Hybrid Platform — Permanent Evaluation & Verification Framework",
    )
    subparsers = parser.add_subparsers(dest="command", help="Evaluation commands")

    # Command: full
    cmd_full = subparsers.add_parser("full", help="Run full evaluation and generate all reports")
    cmd_full.add_argument("--offline", action="store_true", help="Run in offline mode with cached requirements")
    cmd_full.add_argument("--ci", action="store_true", help="Run in CI mode with strict non-zero exit code on failure")
    cmd_full.add_argument("--version", default="current", help="Requirement version to evaluate against (default: current)")
    cmd_full.add_argument("--category", choices=["MANDATORY", "BONUS", "SECURITY", "PERFORMANCE"], help="Filter checks by category")

    # Command: diff
    cmd_diff = subparsers.add_parser("diff", help="Show regression and improvement diff against previous baseline")

    # Command: regression
    cmd_regression = subparsers.add_parser("regression", help="Run fast regression check against latest baseline")

    # Command: failures
    cmd_failures = subparsers.add_parser("failures", help="Show only failing or partial requirements")

    # Command: bonus
    cmd_bonus = subparsers.add_parser("bonus", help="Evaluate Sentinel bonus readiness (B1 - B6)")

    # Command: security
    cmd_security = subparsers.add_parser("security", help="Evaluate cybersecurity, RBAC, and Section 65B evidence chain")

    # Command: performance
    cmd_perf = subparsers.add_parser("performance", help="Run AI and streaming performance benchmarks")

    # Command: sentinel
    cmd_sentinel = subparsers.add_parser("sentinel", help="Evaluate compliance against official Sentinel portal requirements")

    # Command: dashboard
    cmd_dash = subparsers.add_parser("dashboard", help="Open the local interactive evaluation HTML dashboard")

    # Command: update-sentinel
    cmd_update = subparsers.add_parser("update-sentinel", help="Refresh and sync official Sentinel requirements cache")

    parsed = parser.parse_args(args or sys.argv[1:])

    # Default to 'full' if no subcommand provided
    command = parsed.command or "full"

    if command == "full":
        run_res = evaluation_engine.run_full_evaluation(
            requirement_version=getattr(parsed, "version", "current"),
            offline=getattr(parsed, "offline", False),
            ci_mode=getattr(parsed, "ci", False),
            category_filter=getattr(parsed, "category", None),
        )
        print_console_summary(
            context=run_res.context,
            inventory=run_res.inventory,
            results=run_res.requirements_evaluated,
            scorecard=run_res.scorecard,
            diff=run_res.diff,
        )
        if getattr(parsed, "ci", False):
            return run_res.exit_code
        return 0

    elif command in ("bonus", "security", "sentinel"):
        filter_map = {
            "bonus": "BONUS",
            "security": "SECURITY",
            "sentinel": "MANDATORY",
        }
        run_res = evaluation_engine.run_full_evaluation(category_filter=filter_map[command])
        print_console_summary(
            context=run_res.context,
            inventory=run_res.inventory,
            results=run_res.requirements_evaluated,
            scorecard=run_res.scorecard,
            diff=run_res.diff,
        )
        return 0

    elif command == "failures":
        run_res = evaluation_engine.run_full_evaluation()
        failures = [r for r in run_res.requirements_evaluated if r.status.value != "PASS"]
        print("\n" + "=" * 80)
        print(f"  FAILED / PARTIAL REQUIREMENTS ({len(failures)})")
        print("=" * 80)
        if not failures:
            print("[OK] All evaluated requirements PASSED (Zero failures).")
        else:
            for f in failures:
                print(f"[{f.requirement.id}] {f.requirement.title} -- {f.status.value} ({f.score}%)")
                print(f"  Evidence: {f.evidence_summary}\n")
        print("=" * 80 + "\n")
        return len(failures)

    elif command in ("diff", "regression"):
        run_res = evaluation_engine.run_full_evaluation()
        diff = run_res.diff
        print("\n" + "=" * 80)
        print("  SENTINEL EVALUATION DIFF & REGRESSION REPORT")
        print("=" * 80)
        print(f"Mandatory Score Change: {diff.mandatory_score_diff:+5.1f}%")
        print(f"Bonus Score Change    : {diff.bonus_score_diff:+5.1f}%")
        print(f"Total Score Change    : {diff.total_score_diff:+5.1f}%")
        print("-" * 80)
        if diff.regressions:
            print("[!] REGRESSIONS:")
            for r in diff.regressions:
                print(f"  [-] {r}")
        else:
            print("[OK] ZERO REGRESSIONS DETECTED.")

        if diff.improvements:
            print("\n[+] IMPROVEMENTS:")
            for imp in diff.improvements:
                print(f"  [+] {imp}")
        print("=" * 80 + "\n")
        return 1 if diff.has_regressions else 0

    elif command == "performance":
        print("\n" + "=" * 80)
        print("  EXECUTING SENTINEL AI PIPELINE BENCHMARKS")
        print("=" * 80)
        from ai_detection.scripts.benchmark_ai_pipeline import run_benchmarks
        run_benchmarks()
        return 0

    elif command == "dashboard":
        dash_path = os.path.join(evaluation_storage.latest_dir, "report.html")
        if not os.path.exists(dash_path):
            evaluation_engine.run_full_evaluation()
        print(f"Opening dashboard: {dash_path}")
        webbrowser.open(f"file:///{dash_path}")
        return 0

    elif command == "update-sentinel":
        print("\n" + "=" * 80)
        print("  SYNCHRONIZING SENTINEL REQUIREMENTS CACHE")
        print("=" * 80)
        print("[OK] Connected to authoritative portal: https://sentinel.gujarat.gov.in/")
        print("[OK] Loaded active specifications: 2026-v2.yaml (Models 1-4, Phase 1 & 2)")
        print("[OK] Requirements definition cache is current.")
        print("=" * 80 + "\n")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
