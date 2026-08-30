"""
Dynamic Project & Service Discovery Engine for Sentinel Evaluator.
Scans the workspace dynamically to discover services, APIs, tests, databases, and AI models.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class DiscoveredService:
    name: str
    relative_path: str
    absolute_path: str
    service_type: str  # "model1", "model2", "model3", "model4", "orchestrator", "ai", "frontend", "unknown"
    language: str      # "python", "typescript", "javascript", "go", "java", "unknown"
    framework: str     # "fastapi", "flask", "react", "nextjs", "unknown"
    has_dockerfile: bool = False
    has_tests: bool = False
    test_runner: Optional[str] = None  # "pytest", "npm", "go_test", "mvn"
    test_paths: List[str] = field(default_factory=list)
    endpoints_detected: List[str] = field(default_factory=list)


@dataclass
class ProjectInventory:
    workspace_root: str
    discovered_services: List[DiscoveredService]
    ai_models_found: List[str]
    has_docker_compose: bool
    has_kubernetes: bool
    has_helm: bool
    has_terraform: bool
    databases_detected: List[str]
    message_brokers_detected: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "workspace_root": self.workspace_root,
            "total_services": len(self.discovered_services),
            "services": [
                {
                    "name": s.name,
                    "path": s.relative_path,
                    "type": s.service_type,
                    "language": s.language,
                    "framework": s.framework,
                    "test_runner": s.test_runner,
                    "test_paths": s.test_paths,
                }
                for s in self.discovered_services
            ],
            "ai_models_found": self.ai_models_found,
            "infrastructure": {
                "docker_compose": self.has_docker_compose,
                "kubernetes": self.has_kubernetes,
                "helm": self.has_helm,
                "terraform": self.has_terraform,
                "databases": self.databases_detected,
                "message_brokers": self.message_brokers_detected,
            },
        }


class ProjectDiscoveryEngine:
    """Discovers project structure, services, test harnesses, and infrastructure dynamically."""

    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = workspace_root or os.getcwd()

    def discover(self) -> ProjectInventory:
        """Executes full dynamic repository inventory."""
        services: List[DiscoveredService] = []
        ai_models: List[str] = []
        db_types: set[str] = set()
        brokers: set[str] = set()

        # Scan top-level directories
        entries = os.listdir(self.workspace_root)

        for entry in entries:
            entry_path = os.path.join(self.workspace_root, entry)
            if not os.path.isdir(entry_path):
                # Check for root models
                if entry.endswith((".pt", ".onnx", ".engine", ".tflite", ".bin")):
                    ai_models.append(entry)
                continue

            if entry.startswith((".", "node_modules", "venv", ".venv", ".git", "dist", "build")):
                continue

            # Classify directory as service
            service = self._analyze_directory(entry, entry_path)
            if service:
                services.append(service)

        # Check infrastructure files
        has_compose = os.path.exists(os.path.join(self.workspace_root, "docker-compose.yml")) or os.path.exists(
            os.path.join(self.workspace_root, "docker-compose.yaml")
        )
        has_k8s = os.path.exists(os.path.join(self.workspace_root, "infra", "k8s")) or os.path.exists(
            os.path.join(self.workspace_root, "k8s")
        )
        has_helm = os.path.exists(os.path.join(self.workspace_root, "infra", "helm")) or os.path.exists(
            os.path.join(self.workspace_root, "helm")
        )
        has_tf = os.path.exists(os.path.join(self.workspace_root, "infra", "terraform")) or os.path.exists(
            os.path.join(self.workspace_root, "terraform")
        )

        # Scan docker-compose.yml for databases & message brokers if present
        if has_compose:
            compose_path = os.path.join(self.workspace_root, "docker-compose.yml")
            if os.path.exists(compose_path):
                try:
                    with open(compose_path, "r", encoding="utf-8") as f:
                        content = f.read().lower()
                        if "postgres" in content or "postgis" in content:
                            db_types.add("PostgreSQL/PostGIS")
                        if "redis" in content:
                            db_types.add("Redis")
                        if "opensearch" in content or "elasticsearch" in content:
                            db_types.add("OpenSearch")
                        if "kafka" in content:
                            brokers.add("Apache Kafka")
                        if "rabbitmq" in content:
                            brokers.add("RabbitMQ")
                        if "minio" in content:
                            db_types.add("MinIO S3 Object Storage")
                except Exception:
                    pass

        return ProjectInventory(
            workspace_root=self.workspace_root,
            discovered_services=services,
            ai_models_found=ai_models,
            has_docker_compose=has_compose,
            has_kubernetes=has_k8s,
            has_helm=has_helm,
            has_terraform=has_tf,
            databases_detected=list(db_types),
            message_brokers_detected=list(brokers),
        )

    def _analyze_directory(self, dir_name: str, dir_path: str) -> Optional[DiscoveredService]:
        """Analyzes a subdirectory to determine service classification, language, and test harness."""
        # Classify service type
        service_type = "unknown"
        lower_name = dir_name.lower()

        if "model1" in lower_name or "registry" in lower_name:
            service_type = "model1"
        elif "model2" in lower_name or "viewing" in lower_name:
            service_type = "model2"
        elif "model3" in lower_name or "federation" in lower_name:
            service_type = "model3"
        elif "model4" in lower_name or "central" in lower_name:
            service_type = "model4"
        elif "orchestrator" in lower_name or "gateway" in lower_name or "hybrid" in lower_name:
            service_type = "orchestrator"
        elif "ai" in lower_name or "detection" in lower_name or "vision" in lower_name:
            service_type = "ai"
        elif "frontend" in lower_name or "ui" in lower_name or "dashboard" in lower_name:
            service_type = "frontend"
        else:
            # Check if it has python or package files
            if not any(os.path.exists(os.path.join(dir_path, f)) for f in ("pyproject.toml", "package.json", "requirements.txt", "main.py", "app")):
                return None

        # Language and Framework detection
        language = "unknown"
        framework = "unknown"
        test_runner = None
        test_paths: List[str] = []

        has_pyproject = os.path.exists(os.path.join(dir_path, "pyproject.toml"))
        has_reqs = os.path.exists(os.path.join(dir_path, "requirements.txt"))
        has_pkg_json = os.path.exists(os.path.join(dir_path, "package.json"))

        if has_pyproject or has_reqs or os.path.exists(os.path.join(dir_path, "app")):
            language = "python"
            framework = "fastapi"  # default modern backend stack
            test_dir = os.path.join(dir_path, "tests")
            if os.path.exists(test_dir):
                test_runner = "pytest"
                test_paths.append(os.path.relpath(test_dir, self.workspace_root))

        elif has_pkg_json:
            language = "typescript"
            framework = "react"
            test_runner = "npm"

        has_docker = os.path.exists(os.path.join(dir_path, "Dockerfile"))

        return DiscoveredService(
            name=dir_name,
            relative_path=os.path.relpath(dir_path, self.workspace_root),
            absolute_path=dir_path,
            service_type=service_type,
            language=language,
            framework=framework,
            has_dockerfile=has_docker,
            has_tests=bool(test_paths),
            test_runner=test_runner,
            test_paths=test_paths,
        )


# Singleton discovery engine
project_discovery_engine = ProjectDiscoveryEngine()
