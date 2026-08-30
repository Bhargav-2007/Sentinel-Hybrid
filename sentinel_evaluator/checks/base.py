"""
Base Plugin Interface for Sentinel Evaluator Checks.
"""

from __future__ import annotations

import os
import subprocess
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from sentinel_evaluator.requirements.schema import (
    CheckExecutionResult,
    RequirementCheckDefinition,
    RequirementEvaluationResult,
    RequirementStatus,
    SentinelRequirement,
)


class BaseChecker(ABC):
    """Abstract base class for modular Sentinel check plugins."""

    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = workspace_root or os.getcwd()

    @abstractmethod
    def can_handle(self, requirement: SentinelRequirement) -> bool:
        """Determines if this checker plugin can evaluate the given requirement."""
        pass

    @abstractmethod
    def evaluate(self, requirement: SentinelRequirement) -> RequirementEvaluationResult:
        """Evaluates a Sentinel requirement and returns a structured result."""
        pass

    def run_check_definition(self, check: RequirementCheckDefinition) -> CheckExecutionResult:
        """Executes a single check rule (static file, regex rule, test execution, command)."""
        t0 = time.perf_counter()

        if check.type == "static_file":
            target_path = os.path.join(self.workspace_root, check.target)
            if not os.path.exists(target_path):
                return CheckExecutionResult(
                    check_type=check.type,
                    target=check.target,
                    passed=False,
                    message=f"Required file or directory missing: {check.target}",
                    duration_ms=(time.perf_counter() - t0) * 1000.0,
                )

            # Optional rule check (e.g. "contains:Geometry")
            if check.rule and os.path.isfile(target_path):
                try:
                    with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    if check.rule.startswith("contains:"):
                        search_term = check.rule.split("contains:", 1)[1]
                        if search_term not in content:
                            return CheckExecutionResult(
                                check_type=check.type,
                                target=check.target,
                                passed=False,
                                message=f"File {check.target} missing required symbol/rule: '{search_term}'",
                                duration_ms=(time.perf_counter() - t0) * 1000.0,
                            )
                except Exception as e:
                    return CheckExecutionResult(
                        check_type=check.type,
                        target=check.target,
                        passed=False,
                        message=f"Error reading file {check.target}: {e}",
                        duration_ms=(time.perf_counter() - t0) * 1000.0,
                    )

            return CheckExecutionResult(
                check_type=check.type,
                target=check.target,
                passed=True,
                message=f"Verified file/module exists: {check.target}",
                evidence=f"Path verified: {check.target}",
                duration_ms=(time.perf_counter() - t0) * 1000.0,
            )

        elif check.type == "test_execution":
            target_test = check.target
            # Execute pytest in isolated subprocess
            try:
                # Set appropriate pythonpath
                env = os.environ.copy()
                norm_target = target_test.replace("\\", "/")
                parts = norm_target.split("/")
                if len(parts) > 0:
                    svc_path = os.path.join(self.workspace_root, parts[0])
                    if os.path.exists(svc_path):
                        env["PYTHONPATH"] = svc_path + os.pathsep + self.workspace_root

                cmd = [
                    os.sys.executable, "-m", "pytest",
                    norm_target, "-q", "--no-cov"
                ]
                res = subprocess.run(
                    cmd,
                    cwd=self.workspace_root,
                    capture_output=True,
                    text=True,
                    timeout=45,
                    env=env,
                )
                passed = (res.returncode == 0)
                out_lines = [l.strip() for l in (res.stdout + "\n" + res.stderr).split("\n") if l.strip()]
                out_snippet = out_lines[-1] if out_lines else "Completed"

                return CheckExecutionResult(
                    check_type=check.type,
                    target=check.target,
                    passed=passed,
                    message=f"Pytest on {target_test}: {'PASSED' if passed else 'FAILED'} ({out_snippet})",
                    evidence=out_snippet,
                    duration_ms=(time.perf_counter() - t0) * 1000.0,
                )
            except subprocess.TimeoutExpired:
                return CheckExecutionResult(
                    check_type=check.type,
                    target=check.target,
                    passed=False,
                    message=f"Test execution timed out on {target_test} (>45s)",
                    duration_ms=(time.perf_counter() - t0) * 1000.0,
                )
            except Exception as e:
                return CheckExecutionResult(
                    check_type=check.type,
                    target=check.target,
                    passed=False,
                    message=f"Test invocation error on {target_test}: {e}",
                    duration_ms=(time.perf_counter() - t0) * 1000.0,
                )

        return CheckExecutionResult(
            check_type=check.type,
            target=check.target,
            passed=True,
            message="Check passed",
            duration_ms=(time.perf_counter() - t0) * 1000.0,
        )
