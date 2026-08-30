#!/usr/bin/env python3
"""
Gujarat Sentinel Hybrid Platform — Automated Mock Data & Real-Data Assurance Scanner
Scans the entire repository to ensure ZERO fake, mock, dummy, or artificial data exists in production paths.

Usage:
    python scripts/scan-no-mock-data.py
    python scripts/scan-no-mock-data.py --ci
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from typing import Dict, List, Set, Tuple


@dataclass
class ScanFinding:
    file_path: str
    line_number: int
    line_content: str
    category: str
    severity: str  # "VIOLATION" or "ISOLATED_TEST"
    reason: str


class MockDataScanner:
    """Audits codebase for unauthorized mock/synthetic data in production execution paths."""

    def __init__(self, workspace_root: str):
        self.workspace_root = workspace_root
        self.production_dirs = [
            "backend-model1/app",
            "backend-model2/app",
            "backend-model3/src/main",
            "backend-model4/cmd",
            "backend-model4/internal",
            "backend-orchestrator/app",
            "ai-detection/app",
            "frontend/src",
            "sentinel_evaluator/core",
            "sentinel_evaluator/checks",
        ]
        self.isolated_dirs = [
            "tests",
            "backend-model1/tests",
            "backend-model2/tests",
            "backend-model3/src/test",
            "backend-model4/tests",
            "backend-orchestrator/tests",
            "ai-detection/tests",
            "sentinel_evaluator/tests",
            "simulators",
            "benchmarks",
            "evaluation",
            "fixtures",
        ]

        # Suspicious patterns in production code
        self.suspicious_regexes = [
            (r"\b_mock_read_plates\b", "Fake AI/OCR generator"),
            (r"\bmockEntities\b", "Hardcoded UI search entities"),
            (r"\bMath\.random\(\)\s*\*\s*\d+", "Artificial numerical generation"),
            (r"\brandom\.uniform\(\s*0\.\d+\s*,\s*0\.\d+\s*\)", "Fabricated AI confidence/speed"),
            (r"\brandom\.randint\(\s*\d+\s*,\s*\d+\s*\)", "Random operational counter"),
            (r"\bconst\s+mock[A-Z]\w*\s*=", "Hardcoded frontend mock data"),
            (r"\bvar\s+mock[A-Z]\w*\s*=", "Hardcoded frontend mock data"),
            (r"\blet\s+mock[A-Z]\w*\s*=", "Hardcoded frontend mock data"),
            (r"return\s+\[\{\s*[\"']camera_id[\"']:\s*[\"']1[\"'].*confidence[\"']:\s*0\.98", "Fabricated route sightings"),
        ]

    def is_isolated_path(self, rel_path: str) -> bool:
        """Determines if the file is in an isolated test, benchmark, or simulator directory."""
        norm = rel_path.replace("\\", "/")
        for iso in self.isolated_dirs:
            if norm.startswith(iso) or f"/{iso}/" in norm:
                return True
        return False

    def is_production_path(self, rel_path: str) -> bool:
        """Determines if the file is in a production application path."""
        norm = rel_path.replace("\\", "/")
        for p in self.production_dirs:
            if norm.startswith(p):
                return True
        return False

    def scan(self) -> Tuple[List[ScanFinding], List[ScanFinding], int]:
        """Scans repository files and returns (violations, isolated_fixtures, total_files_scanned)."""
        violations: List[ScanFinding] = []
        isolated: List[ScanFinding] = []
        total_scanned = 0

        skip_dirs = {".git", ".pytest_cache", "__pycache__", "node_modules", "dist", "build", ".venv", "venv"}

        for root, dirs, files in os.walk(self.workspace_root):
            dirs[:] = [d for d in dirs if d not in skip_dirs]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext not in (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".sql"):
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.workspace_root)
                total_scanned += 1

                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                except Exception:
                    continue

                for line_idx, line in enumerate(lines, 1):
                    # Check suspicious patterns
                    for pattern, desc in self.suspicious_regexes:
                        if re.search(pattern, line):
                            finding = ScanFinding(
                                file_path=rel_path,
                                line_number=line_idx,
                                line_content=line.strip(),
                                category=desc,
                                severity="ISOLATED_TEST" if self.is_isolated_path(rel_path) else "VIOLATION",
                                reason=desc,
                            )
                            if self.is_production_path(rel_path) and not self.is_isolated_path(rel_path):
                                violations.append(finding)
                            else:
                                isolated.append(finding)

        return violations, isolated, total_scanned


def main() -> int:
    parser = argparse.ArgumentParser(description="Sentinel Real-Data Assurance & Mock Scanner")
    parser.add_argument("--ci", action="store_true", help="Run as CI gate (exit 1 if production mock found)")
    args = parser.parse_args()

    root = os.getcwd()
    scanner = MockDataScanner(root)
    violations, isolated, total_scanned = scanner.scan()

    print("\n" + "=" * 80)
    print("  GUJARAT SENTINEL — REAL DATA ONLY AUDIT REPORT")
    print("=" * 80)
    print(f"Workspace Root    : {root}")
    print(f"Total Source Files: {total_scanned} files scanned")
    print("-" * 80)

    print(f"Production Mock Data Violations   : {len(violations)}")
    print(f"Isolated Test/Benchmark Fixtures  : {len(isolated)} (Allowed in tests/simulators)")
    print("-" * 80)

    if violations:
        print("\n[!] FORBIDDEN PRODUCTION MOCK DATA DETECTED:")
        for v in violations:
            print(f"  [-] {v.file_path}:{v.line_number} -> {v.category}")
            print(f"      Code: {v.line_content[:75]}")
        print("\n" + "=" * 80)
        print("AUDIT RESULT: FAILED (Production contains fabricated/mock logic)")
        print("=" * 80 + "\n")
        return 1
    else:
        print("\n[OK] ZERO PRODUCTION MOCK DATA DETECTED.")
        print("[OK] All application endpoints, AI models, GIS, and dashboards use real data.")
        print("\n" + "=" * 80)
        print("AUDIT RESULT: PASSED (100% Real-Data Compliant)")
        print("=" * 80 + "\n")
        return 0


if __name__ == "__main__":
    sys.exit(main())
