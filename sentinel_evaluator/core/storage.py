"""
Persistent Storage Engine for Sentinel Evaluator: SQLite Analytical Store & Report Archive.
"""

from __future__ import annotations

import json
import os
import shutil
import sqlite3
from dataclasses import asdict
from typing import Any, Dict, List, Optional

from sentinel_evaluator.core.context import EvaluationContext
from sentinel_evaluator.requirements.schema import RequirementEvaluationResult


class EvaluationStorage:
    """Manages persistent SQLite historical metrics and multi-format report file archiving."""

    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = workspace_root or os.getcwd()
        self.reports_dir = os.path.join(self.workspace_root, "reports")
        self.history_dir = os.path.join(self.reports_dir, "history")
        self.baseline_dir = os.path.join(self.reports_dir, "baseline")
        self.latest_dir = os.path.join(self.reports_dir, "latest")
        self.db_dir = os.path.join(self.workspace_root, "evaluation", "data")
        self.db_path = os.path.join(self.db_dir, "evaluations.db")

        self._ensure_directories()
        self._init_sqlite_db()

    def _ensure_directories(self) -> None:
        """Creates directory structure if missing."""
        for d in (self.reports_dir, self.history_dir, self.baseline_dir, self.latest_dir, self.db_dir):
            os.makedirs(d, exist_ok=True)

    def _init_sqlite_db(self) -> None:
        """Initializes SQLite schema for long-term historical analytics."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS evaluations (
                    evaluation_id TEXT PRIMARY KEY,
                    timestamp_utc TEXT NOT NULL,
                    git_commit TEXT,
                    git_branch TEXT,
                    git_tag TEXT,
                    mandatory_score REAL,
                    bonus_score REAL,
                    total_score REAL,
                    status TEXT,
                    summary_json TEXT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS requirement_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluation_id TEXT NOT NULL,
                    req_id TEXT NOT NULL,
                    category TEXT,
                    status TEXT NOT NULL,
                    score REAL,
                    passed_checks INTEGER,
                    total_checks INTEGER,
                    evidence TEXT,
                    FOREIGN KEY(evaluation_id) REFERENCES evaluations(evaluation_id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluation_id TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT,
                    is_measured INTEGER DEFAULT 1,
                    FOREIGN KEY(evaluation_id) REFERENCES evaluations(evaluation_id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_model_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluation_id TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    name TEXT,
                    version TEXT,
                    f1_score REAL,
                    latency_ms REAL,
                    fps REAL,
                    artifact_sha256 TEXT,
                    FOREIGN KEY(evaluation_id) REFERENCES evaluations(evaluation_id)
                )
            """)
            conn.commit()

    def save_evaluation(
        self,
        context: EvaluationContext,
        requirement_results: List[RequirementEvaluationResult],
        mandatory_score: float,
        bonus_score: float,
        total_score: float,
        inventory_dict: Dict[str, Any],
        perf_metrics: Optional[Dict[str, float]] = None,
        ai_metrics: Optional[List[Dict[str, Any]]] = None,
        raw_report_json: Optional[str] = None,
        raw_report_md: Optional[str] = None,
        raw_report_html: Optional[str] = None,
    ) -> str:
        """Saves evaluation data into SQLite analytical database and disk history folders."""
        eval_id = context.evaluation_id
        commit = context.git_commit
        history_run_dir = os.path.join(self.history_dir, f"{eval_id}_{commit}")
        os.makedirs(history_run_dir, exist_ok=True)

        summary_dict = {
            "evaluation_id": eval_id,
            "timestamp_utc": context.timestamp_utc,
            "git_commit": commit,
            "git_branch": context.git_branch,
            "mandatory_score": mandatory_score,
            "bonus_score": bonus_score,
            "total_score": total_score,
            "total_requirements": len(requirement_results),
            "passed_requirements": sum(1 for r in requirement_results if r.status.value == "PASS"),
        }

        # 1. Insert into SQLite DB
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO evaluations 
                (evaluation_id, timestamp_utc, git_commit, git_branch, git_tag, mandatory_score, bonus_score, total_score, status, summary_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    eval_id,
                    context.timestamp_utc,
                    commit,
                    context.git_branch,
                    context.git_tag,
                    mandatory_score,
                    bonus_score,
                    total_score,
                    "SUCCESS",
                    json.dumps(summary_dict),
                ),
            )

            # Insert requirement results
            for r in requirement_results:
                cursor.execute(
                    """
                    INSERT INTO requirement_results 
                    (evaluation_id, req_id, category, status, score, passed_checks, total_checks, evidence)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        eval_id,
                        r.requirement.id,
                        r.requirement.category.value,
                        r.status.value,
                        r.score,
                        r.passed_checks,
                        r.total_checks,
                        r.evidence_summary,
                    ),
                )

            # Insert performance metrics
            if perf_metrics:
                for k, v in perf_metrics.items():
                    cursor.execute(
                        """
                        INSERT INTO performance_metrics (evaluation_id, metric_name, value, unit, is_measured)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (eval_id, k, v, "ms" if "latency" in k or "time" in k else "unit", 1),
                    )

            # Insert AI model metrics
            if ai_metrics:
                for m in ai_metrics:
                    cursor.execute(
                        """
                        INSERT INTO ai_model_metrics (evaluation_id, model_id, name, version, f1_score, latency_ms, fps, artifact_sha256)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            eval_id,
                            m.get("model_id", "unknown"),
                            m.get("name", "model"),
                            m.get("version", "1.0"),
                            m.get("f1_score", 0.0),
                            m.get("latency_ms", 0.0),
                            m.get("fps", 0.0),
                            m.get("artifact_sha256", ""),
                        ),
                    )
            conn.commit()

        # 2. Save JSON, MD, HTML artifacts into history/ and update latest/
        report_data = {
            "context": context.to_dict(),
            "summary": summary_dict,
            "inventory": inventory_dict,
            "requirements": [r.to_dict() for r in requirement_results],
            "performance_metrics": perf_metrics or {},
            "ai_models": ai_metrics or [],
        }

        json_str = raw_report_json or json.dumps(report_data, indent=2)

        # Write to history dir
        with open(os.path.join(history_run_dir, "report.json"), "w", encoding="utf-8") as f:
            f.write(json_str)

        with open(os.path.join(history_run_dir, "metrics.json"), "w", encoding="utf-8") as f:
            json.dump(summary_dict, f, indent=2)

        if raw_report_md:
            with open(os.path.join(history_run_dir, "report.md"), "w", encoding="utf-8") as f:
                f.write(raw_report_md)

        if raw_report_html:
            with open(os.path.join(history_run_dir, "report.html"), "w", encoding="utf-8") as f:
                f.write(raw_report_html)

        # Update latest/
        for fname in os.listdir(history_run_dir):
            src = os.path.join(history_run_dir, fname)
            dst = os.path.join(self.latest_dir, fname)
            shutil.copy2(src, dst)

        # If baseline is empty, make this initial run the baseline
        baseline_report = os.path.join(self.baseline_dir, "report.json")
        if not os.path.exists(baseline_report):
            for fname in os.listdir(history_run_dir):
                shutil.copy2(os.path.join(history_run_dir, fname), os.path.join(self.baseline_dir, fname))

        return history_run_dir

    def get_latest_evaluation(self) -> Optional[Dict[str, Any]]:
        """Retrieves latest evaluation JSON payload."""
        latest_json = os.path.join(self.latest_dir, "report.json")
        if os.path.exists(latest_json):
            try:
                with open(latest_json, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return None

    def get_baseline_evaluation(self) -> Optional[Dict[str, Any]]:
        """Retrieves baseline evaluation JSON payload."""
        baseline_json = os.path.join(self.baseline_dir, "report.json")
        if os.path.exists(baseline_json):
            try:
                with open(baseline_json, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return None

    def get_historical_trends(self, limit: int = 15) -> List[Dict[str, Any]]:
        """Queries historical evaluation scores from SQLite for trend visualization."""
        trends = []
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT evaluation_id, timestamp_utc, git_commit, mandatory_score, bonus_score, total_score
                FROM evaluations
                ORDER BY timestamp_utc ASC
                LIMIT ?
                """,
                (limit,),
            )
            for row in cursor.fetchall():
                trends.append(dict(row))
        return trends


# Singleton storage instance
evaluation_storage = EvaluationStorage()
