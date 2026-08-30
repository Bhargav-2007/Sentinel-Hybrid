"""
Data schemas for Sentinel Requirements and Evaluation Verification Results.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class RequirementStatus(str, Enum):
    PASS = "PASS"
    PARTIAL = "PARTIAL"
    FAIL = "FAIL"
    EXTERNAL_DEPENDENCY = "EXTERNAL_DEPENDENCY"
    NOT_VERIFIABLE = "NOT_VERIFIABLE"


class RequirementSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RequirementCategory(str, Enum):
    MANDATORY = "MANDATORY"
    BONUS = "BONUS"
    SECURITY = "SECURITY"
    PERFORMANCE = "PERFORMANCE"
    OPERATIONS = "OPERATIONS"


@dataclass
class RequirementCheckDefinition:
    type: str  # "static_file", "schema_check", "test_execution", "api_endpoint", "benchmark_threshold"
    target: str
    rule: Optional[str] = None
    expected: Optional[Any] = None
    command: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None


@dataclass
class SentinelRequirement:
    id: str  # e.g., "M-001", "B-001"
    title: str
    description: str
    category: RequirementCategory
    model_scope: str  # "model1", "model2", "model3", "model4", "hybrid", "ai", "security"
    official_source: str
    severity: RequirementSeverity
    mandatory: bool
    checks: List[RequirementCheckDefinition] = field(default_factory=list)
    weight: float = 1.0


@dataclass
class CheckExecutionResult:
    check_type: str
    target: str
    passed: bool
    message: str
    evidence: Optional[str] = None
    duration_ms: float = 0.0


@dataclass
class RequirementEvaluationResult:
    requirement: SentinelRequirement
    status: RequirementStatus
    score: float  # 0.0 to 100.0
    passed_checks: int
    total_checks: int
    check_results: List[CheckExecutionResult]
    evidence_summary: str
    recommendations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.requirement.id,
            "title": self.requirement.title,
            "category": self.requirement.category.value,
            "model_scope": self.requirement.model_scope,
            "mandatory": self.requirement.mandatory,
            "severity": self.requirement.severity.value,
            "status": self.status.value,
            "score": self.score,
            "passed_checks": self.passed_checks,
            "total_checks": self.total_checks,
            "evidence_summary": self.evidence_summary,
            "recommendations": self.recommendations,
            "check_details": [
                {
                    "type": c.check_type,
                    "target": c.target,
                    "passed": c.passed,
                    "message": c.message,
                    "evidence": c.evidence,
                }
                for c in self.check_results
            ],
        }
