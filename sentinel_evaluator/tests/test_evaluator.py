"""
Self-Testing Test Suite for Sentinel Evaluator Framework.
Verifies discovery, requirements parsing, scoring, SQLite persistence, and regression diffing.
"""

import os
import pytest

from sentinel_evaluator.core.context import collect_context
from sentinel_evaluator.core.discovery import ProjectDiscoveryEngine
from sentinel_evaluator.core.storage import EvaluationStorage
from sentinel_evaluator.core.scoring import ScoringEngine
from sentinel_evaluator.core.regression import RegressionDetector
from sentinel_evaluator.core.engine import EvaluationEngine
from sentinel_evaluator.requirements.loader import RequirementLoader
from sentinel_evaluator.requirements.schema import (
    RequirementCategory,
    RequirementEvaluationResult,
    RequirementSeverity,
    RequirementStatus,
    SentinelRequirement,
)


def test_evaluator_context_collector():
    ctx = collect_context()
    assert ctx.evaluation_id is not None
    assert ctx.python_version is not None
    assert ctx.evaluator_version == "2.0.0"
    assert ctx.os_name in ("Windows", "Linux", "Darwin")


def test_evaluator_project_discovery():
    engine = ProjectDiscoveryEngine()
    inv = engine.discover()
    assert len(inv.discovered_services) >= 4
    service_types = {s.service_type for s in inv.discovered_services}
    assert "model1" in service_types or "orchestrator" in service_types
    assert inv.has_docker_compose is True


def test_evaluator_requirement_loader():
    loader = RequirementLoader()
    reqs = loader.load_requirements("current")
    assert len(reqs) >= 8
    req_ids = {r.id for r in reqs}
    assert "M-001" in req_ids
    assert "M-002" in req_ids
    assert "M-007" in req_ids


def test_evaluator_scoring_engine():
    scorer = ScoringEngine()
    req1 = SentinelRequirement(
        id="M-TEST-1",
        title="Test Mand Req 1",
        description="test",
        category=RequirementCategory.MANDATORY,
        model_scope="model1",
        official_source="portal",
        severity=RequirementSeverity.HIGH,
        mandatory=True,
    )
    req2 = SentinelRequirement(
        id="B-TEST-1",
        title="Test Bonus Req 1",
        description="test",
        category=RequirementCategory.BONUS,
        model_scope="ai",
        official_source="portal",
        severity=RequirementSeverity.MEDIUM,
        mandatory=False,
    )

    results = [
        RequirementEvaluationResult(
            requirement=req1,
            status=RequirementStatus.PASS,
            score=100.0,
            passed_checks=1,
            total_checks=1,
            check_results=[],
            evidence_summary="Verified",
        ),
        RequirementEvaluationResult(
            requirement=req2,
            status=RequirementStatus.PASS,
            score=100.0,
            passed_checks=1,
            total_checks=1,
            check_results=[],
            evidence_summary="Verified",
        ),
    ]

    card = scorer.compute_scores(results)
    assert card.mandatory_score == 100.0
    assert card.bonus_score == 100.0
    assert card.overall_readiness == 100.0
    assert card.is_ready_for_submission is True


def test_evaluator_regression_detector():
    detector = RegressionDetector()
    current_report = {
        "summary": {"mandatory_score": 100.0, "bonus_score": 100.0, "total_score": 100.0},
        "requirements": [
            {"id": "M-001", "title": "Registry", "status": "PASS", "score": 100.0},
        ],
        "performance_metrics": {"latency_ms": 69.0},
    }
    previous_report = {
        "summary": {"mandatory_score": 90.0, "bonus_score": 80.0, "total_score": 88.0},
        "requirements": [
            {"id": "M-001", "title": "Registry", "status": "PARTIAL", "score": 75.0},
        ],
        "performance_metrics": {"latency_ms": 85.0},
    }

    diff = detector.compare(current_report, previous_report)
    assert diff.has_regressions is False
    assert diff.has_improvements is True
    assert diff.mandatory_score_diff == 10.0


def test_evaluator_storage_sqlite_roundtrip(tmp_path):
    storage = EvaluationStorage(workspace_root=str(tmp_path))
    ctx = collect_context(workspace_root=str(tmp_path))

    req = SentinelRequirement(
        id="M-001",
        title="Camera Registry",
        description="test",
        category=RequirementCategory.MANDATORY,
        model_scope="model1",
        official_source="portal",
        severity=RequirementSeverity.HIGH,
        mandatory=True,
    )
    result = RequirementEvaluationResult(
        requirement=req,
        status=RequirementStatus.PASS,
        score=100.0,
        passed_checks=1,
        total_checks=1,
        check_results=[],
        evidence_summary="Verified",
    )

    history_dir = storage.save_evaluation(
        context=ctx,
        requirement_results=[result],
        mandatory_score=100.0,
        bonus_score=100.0,
        total_score=100.0,
        inventory_dict={"services": []},
    )

    assert os.path.exists(history_dir)
    assert os.path.exists(os.path.join(history_dir, "report.json"))

    latest = storage.get_latest_evaluation()
    assert latest is not None
    assert latest["summary"]["mandatory_score"] == 100.0

    trends = storage.get_historical_trends()
    assert len(trends) >= 1
