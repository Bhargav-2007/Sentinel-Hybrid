"""
Requirement Loader & Version Resolver for Sentinel Evaluator.
"""

from __future__ import annotations

import os
from typing import Dict, List, Optional
import yaml

from sentinel_evaluator.requirements.schema import (
    RequirementCategory,
    RequirementCheckDefinition,
    RequirementSeverity,
    SentinelRequirement,
)


class RequirementLoader:
    """Loads and validates versioned Sentinel hackathon requirements from YAML files."""

    def __init__(self, requirements_dir: Optional[str] = None):
        if requirements_dir:
            self.requirements_dir = requirements_dir
        else:
            self.requirements_dir = os.path.join(os.path.dirname(__file__), "data")

    def list_available_versions(self) -> List[str]:
        """Lists available requirement definition versions in requirements directory."""
        if not os.path.exists(self.requirements_dir):
            return ["current", "2026-v2"]
        files = os.listdir(self.requirements_dir)
        return [f.replace(".yaml", "").replace(".yml", "") for f in files if f.endswith((".yaml", ".yml"))]

    def load_requirements(self, version_or_file: str = "current") -> List[SentinelRequirement]:
        """Loads requirement list for specified version or file path."""
        target_path = version_or_file
        if not os.path.isabs(target_path) and not os.path.exists(target_path):
            candidates = [
                os.path.join(self.requirements_dir, f"{version_or_file}.yaml"),
                os.path.join(self.requirements_dir, f"{version_or_file}.yml"),
                os.path.join(self.requirements_dir, version_or_file),
            ]
            for c in candidates:
                if os.path.exists(c):
                    target_path = c
                    break

        if os.path.exists(target_path):
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    return self._parse_yaml_data(data)
            except Exception as e:
                # Log and fallback to default built-ins
                pass

        return self.get_builtin_requirements()

    def _parse_yaml_data(self, data: Dict[str, Any]) -> List[SentinelRequirement]:
        """Parses raw YAML data into SentinelRequirement objects."""
        requirements: List[SentinelRequirement] = []
        raw_list = data.get("requirements", [])

        for item in raw_list:
            checks: List[RequirementCheckDefinition] = []
            for chk in item.get("checks", []):
                checks.append(
                    RequirementCheckDefinition(
                        type=chk.get("type", "static_file"),
                        target=chk.get("target", ""),
                        rule=chk.get("rule"),
                        expected=chk.get("expected"),
                        command=chk.get("command"),
                        min_value=chk.get("min_value"),
                        max_value=chk.get("max_value"),
                    )
                )

            req = SentinelRequirement(
                id=item["id"],
                title=item["title"],
                description=item.get("description", ""),
                category=RequirementCategory(item.get("category", "MANDATORY")),
                model_scope=item.get("model_scope", "hybrid"),
                official_source=item.get("official_source", "https://sentinel.gujarat.gov.in/"),
                severity=RequirementSeverity(item.get("severity", "HIGH")),
                mandatory=item.get("mandatory", True),
                checks=checks,
                weight=float(item.get("weight", 1.0)),
            )
            requirements.append(req)

        return requirements

    def get_builtin_requirements(self) -> List[SentinelRequirement]:
        """Provides resilient built-in Sentinel hackathon requirements if YAML is offline."""
        return [
            SentinelRequirement(
                id="M-001",
                title="Centralised CCTV Camera Registry & Master Catalog",
                description="Model 1 acts as the authoritative registry storing unique Camera ID, ownership department, site, and stream URI.",
                category=RequirementCategory.MANDATORY,
                model_scope="model1",
                official_source="https://sentinel.gujarat.gov.in/problems",
                severity=RequirementSeverity.CRITICAL,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-model1/app/db/models.py"),
                    RequirementCheckDefinition(type="static_file", target="backend-model1/app/schemas/camera.py"),
                    RequirementCheckDefinition(type="test_execution", target="backend-model1/tests/unit"),
                ],
                weight=1.5,
            ),
            SentinelRequirement(
                id="M-002",
                title="PostGIS Spatial Foundation & Geographical Querying",
                description="Spatial database with Geometry(Point, 4326), bounding box queries, and radius search for police operations.",
                category=RequirementCategory.MANDATORY,
                model_scope="model1",
                official_source="https://sentinel.gujarat.gov.in/problems",
                severity=RequirementSeverity.CRITICAL,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-model1/app/services/gis_service.py"),
                    RequirementCheckDefinition(type="static_file", target="backend-model1/app/db/models.py", rule="contains:Geometry"),
                ],
                weight=1.5,
            ),
            SentinelRequirement(
                id="M-003",
                title="RTSP over TCP Transport with Monotonic PTS Pacing",
                description="Video ingest enforcing rtsp_transport;tcp, monotonic presentation timestamps without wall-clock skew, and exponential backoff.",
                category=RequirementCategory.MANDATORY,
                model_scope="model2",
                official_source="https://sentinel.gujarat.gov.in/resource",
                severity=RequirementSeverity.CRITICAL,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="ai-detection/app/utils/video.py"),
                    RequirementCheckDefinition(type="test_execution", target="ai-detection/tests/test_ai_detection.py"),
                ],
                weight=1.5,
            ),
            SentinelRequirement(
                id="M-004",
                title="ANPR Engine with Indian HSRP Normalization",
                description="Automated number plate recognition conforming to Indian vehicle registration standards with character correction.",
                category=RequirementCategory.MANDATORY,
                model_scope="model2",
                official_source="https://sentinel.gujarat.gov.in/problems",
                severity=RequirementSeverity.CRITICAL,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="ai-detection/app/ocr/plate_reader.py"),
                    RequirementCheckDefinition(type="test_execution", target="backend-model2/tests/unit"),
                ],
                weight=1.5,
            ),
            SentinelRequirement(
                id="M-005",
                title="VMS Federation Adapter Framework & Extensible SDK",
                description="Model 3 Java enterprise connector architecture supporting multi-vendor VMS integration without core code rewrites.",
                category=RequirementCategory.MANDATORY,
                model_scope="model3",
                official_source="https://sentinel.gujarat.gov.in/problems",
                severity=RequirementSeverity.HIGH,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-model3/pom.xml"),
                    RequirementCheckDefinition(type="static_file", target="backend-model3/src"),
                ],
                weight=1.0,
            ),
            SentinelRequirement(
                id="M-006",
                title="Central VMS Storage, Recording & Clip Extraction",
                description="Model 4 Go high-performance central stream hub, storage tiering (hot/warm/cold), and video evidence recording.",
                category=RequirementCategory.MANDATORY,
                model_scope="model4",
                official_source="https://sentinel.gujarat.gov.in/problems",
                severity=RequirementSeverity.HIGH,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-model4/go.mod"),
                    RequirementCheckDefinition(type="static_file", target="backend-model4/cmd"),
                ],
                weight=1.0,
            ),
            SentinelRequirement(
                id="M-007",
                title="Hybrid Orchestrator & APB Hotlist Watchlist Matching",
                description="Cross-model integration linking Model 1 GIS with AI detections to generate real-time law enforcement alerts.",
                category=RequirementCategory.MANDATORY,
                model_scope="hybrid",
                official_source="https://sentinel.gujarat.gov.in/problems",
                severity=RequirementSeverity.CRITICAL,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-orchestrator/app/services/ai_orchestrator.py"),
                    RequirementCheckDefinition(type="test_execution", target="backend-orchestrator/tests/test_platform.py"),
                ],
                weight=1.5,
            ),
            SentinelRequirement(
                id="M-008",
                title="Section 65B Electronic Evidence Certification",
                description="Cryptographic SHA-256 evidence hashing and tamper-evident certificate generation for court prosecution.",
                category=RequirementCategory.MANDATORY,
                model_scope="security",
                official_source="Bharatiya Sakshya Adhiniyam / Section 65B",
                severity=RequirementSeverity.HIGH,
                mandatory=True,
                checks=[
                    RequirementCheckDefinition(type="test_execution", target="backend-orchestrator/tests/test_platform.py"),
                ],
                weight=1.0,
            ),
            # Bonus Requirements
            SentinelRequirement(
                id="B-001",
                title="Bonus B1: Innovative Hybrid Orchestration",
                description="Unified integration of Models 1-4 with shared GIS, common identity, and event-driven architecture.",
                category=RequirementCategory.BONUS,
                model_scope="hybrid",
                official_source="Sentinel Bonus Criteria",
                severity=RequirementSeverity.MEDIUM,
                mandatory=False,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-orchestrator/app/services/ai_orchestrator.py"),
                ],
                weight=1.0,
            ),
            SentinelRequirement(
                id="B-002",
                title="Bonus B2: Advanced Cross-Camera Movement Tracking",
                description="Multi-camera vehicle correlation with Bayesian matching, Dijkstra corridor routing, and cloned plate anomaly detection.",
                category=RequirementCategory.BONUS,
                model_scope="ai",
                official_source="Sentinel Bonus Criteria",
                severity=RequirementSeverity.MEDIUM,
                mandatory=False,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-orchestrator/app/services/cross_camera_correlator.py"),
                    RequirementCheckDefinition(type="static_file", target="backend-orchestrator/app/services/camera_graph.py"),
                    RequirementCheckDefinition(type="test_execution", target="backend-orchestrator/tests/test_correlation_and_graph.py"),
                ],
                weight=1.0,
            ),
            SentinelRequirement(
                id="B-003",
                title="Bonus B3: Additional Operational Analytics",
                description="Extra intelligence including vehicle color, travel direction, speed estimation, zone intrusion, and camera tampering.",
                category=RequirementCategory.BONUS,
                model_scope="ai",
                official_source="Sentinel Bonus Criteria",
                severity=RequirementSeverity.MEDIUM,
                mandatory=False,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="ai-detection/app/detectors/attributes.py"),
                    RequirementCheckDefinition(type="static_file", target="ai-detection/app/detectors/anomalies.py"),
                    RequirementCheckDefinition(type="test_execution", target="ai-detection/tests/test_ai_advanced.py"),
                ],
                weight=1.0,
            ),
            SentinelRequirement(
                id="B-004",
                title="Bonus B4: Edge Processing & Bandwidth Optimization",
                description="Adaptive frame rate governor (2-25 FPS), bounded priority queues, and GPU resource management.",
                category=RequirementCategory.BONUS,
                model_scope="ai",
                official_source="Sentinel Bonus Criteria",
                severity=RequirementSeverity.MEDIUM,
                mandatory=False,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="ai-detection/app/utils/scheduler.py"),
                ],
                weight=1.0,
            ),
            SentinelRequirement(
                id="B-005",
                title="Bonus B5: Enhanced Cybersecurity & RBAC",
                description="OAuth2/JWT authentication, departmental RBAC, immutable audit logging, and cryptographic model verification.",
                category=RequirementCategory.BONUS,
                model_scope="security",
                official_source="Sentinel Bonus Criteria",
                severity=RequirementSeverity.MEDIUM,
                mandatory=False,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="ai-detection/app/utils/model_registry.py"),
                ],
                weight=1.0,
            ),
            SentinelRequirement(
                id="B-006",
                title="Bonus B6: Operational Dashboards & Real-Time APIs",
                description="Real-time WebSocket event broadcaster, OpenAPI contracts, health endpoints, and Prometheus metrics.",
                category=RequirementCategory.BONUS,
                model_scope="operations",
                official_source="Sentinel Bonus Criteria",
                severity=RequirementSeverity.MEDIUM,
                mandatory=False,
                checks=[
                    RequirementCheckDefinition(type="static_file", target="backend-orchestrator/app/api/v1/endpoints/cameras.py"),
                ],
                weight=1.0,
            ),
        ]


# Singleton loader instance
requirement_loader = RequirementLoader()
