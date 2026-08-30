"""
Execution Context & Environment Metadata Collector for Sentinel Evaluator.
"""

from __future__ import annotations

import os
import platform
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional


@dataclass
class EvaluationContext:
    evaluation_id: str
    timestamp_utc: str
    git_commit: str
    git_branch: str
    git_tag: Optional[str]
    repository_version: str
    evaluator_version: str
    os_name: str
    os_release: str
    os_arch: str
    python_version: str
    docker_version: Optional[str] = None
    cuda_available: bool = False
    gpu_name: Optional[str] = None
    workspace_root: str = field(default_factory=lambda: os.getcwd())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "evaluation_id": self.evaluation_id,
            "timestamp_utc": self.timestamp_utc,
            "git_commit": self.git_commit,
            "git_branch": self.git_branch,
            "git_tag": self.git_tag,
            "repository_version": self.repository_version,
            "evaluator_version": self.evaluator_version,
            "os_name": self.os_name,
            "os_release": self.os_release,
            "os_arch": self.os_arch,
            "python_version": self.python_version,
            "docker_version": self.docker_version,
            "cuda_available": self.cuda_available,
            "gpu_name": self.gpu_name,
            "workspace_root": self.workspace_root,
        }


def collect_context(workspace_root: Optional[str] = None) -> EvaluationContext:
    """Collects runtime execution metadata, git commit details, and system environment info."""
    root = workspace_root or os.getcwd()
    now = datetime.now(timezone.utc)
    eval_id = now.strftime("%Y-%m-%d_%H-%M-%S")

    # Git metadata
    commit = "dev-local"
    branch = "main"
    tag = "v1.0.0"

    try:
        commit_res = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=root, capture_output=True, text=True, timeout=5
        )
        if commit_res.returncode == 0:
            commit = commit_res.stdout.strip()

        branch_res = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=root, capture_output=True, text=True, timeout=5
        )
        if branch_res.returncode == 0:
            branch = branch_res.stdout.strip()

        tag_res = subprocess.run(
            ["git", "describe", "--tags", "--exact-match"],
            cwd=root, capture_output=True, text=True, timeout=5
        )
        if tag_res.returncode == 0 and tag_res.stdout.strip():
            tag = tag_res.stdout.strip()
    except Exception:
        pass

    # Docker metadata
    docker_v = None
    try:
        docker_res = subprocess.run(
            ["docker", "--version"],
            capture_output=True, text=True, timeout=5
        )
        if docker_res.returncode == 0:
            docker_v = docker_res.stdout.strip()
    except Exception:
        pass

    # GPU / PyTorch check
    cuda_avail = False
    gpu_name = None
    try:
        import torch
        cuda_avail = torch.cuda.is_available()
        if cuda_avail:
            gpu_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    return EvaluationContext(
        evaluation_id=eval_id,
        timestamp_utc=now.isoformat(),
        git_commit=commit,
        git_branch=branch,
        git_tag=tag,
        repository_version="1.0.0",
        evaluator_version="2.0.0",
        os_name=platform.system(),
        os_release=platform.release(),
        os_arch=platform.machine(),
        python_version=platform.python_version(),
        docker_version=docker_v,
        cuda_available=cuda_avail,
        gpu_name=gpu_name,
        workspace_root=root,
    )
