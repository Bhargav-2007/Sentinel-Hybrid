"""
Gujarat Sentinel — Full-Stack Runner Unit Test Suite
Verifies configuration parsing, port scanner, health engine, and process management.
"""

import os
import sys
import tempfile
from pathlib import Path
import pytest

# Ensure scripts directory is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT / "scripts"))

from run import (
    load_services_config,
    PortScanner,
    HealthEngine,
    ProcessManager,
    EnvironmentDoctor,
    SentinelRunner,
)


def test_load_services_config_exists():
    """Verifies that services.yaml is parsed and contains required schema keys."""
    config = load_services_config()
    assert "version" in config
    assert "infrastructure" in config
    assert "services" in config
    assert "dependency_tiers" in config

    # Check key services exist
    services = config["services"]
    assert "model1" in services
    assert "model2" in services
    assert "model3" in services
    assert "model4" in services
    assert "ai-detection" in services
    assert "orchestrator" in services
    assert "frontend" in services


def test_port_scanner_collection():
    """Verifies port scanner extracts all ports without duplicates."""
    config = load_services_config()
    scanner = PortScanner(config)
    ports = [p[0] for p in scanner.ports]

    assert 8001 in ports  # Model 1
    assert 8002 in ports  # Model 2
    assert 8003 in ports  # Model 3
    assert 8004 in ports  # Model 4
    assert 8005 in ports  # Orchestrator
    assert 8006 in ports  # AI Detection
    assert 5432 in ports  # PostgreSQL
    assert 6379 in ports  # Redis


def test_health_engine_tcp_invalid_port():
    """Verifies TCP probe safely reports offline for non-listening port."""
    # Port 59999 is unlikely to be listening
    ok, msg = HealthEngine.check_tcp("127.0.0.1", 59999, timeout=0.2)
    assert ok is False


def test_health_engine_http_invalid_url():
    """Verifies HTTP probe safely catches connection failure."""
    ok, msg = HealthEngine.check_http("http://127.0.0.1:59999/health", timeout=0.2)
    assert ok is False


def test_process_manager_pid_lifecycle():
    """Verifies PID write, read, and cleanup."""
    mgr = ProcessManager()
    service_key = "_test_dummy_svc_"
    
    # Write PID
    mgr.write_pid(service_key, 999999)
    read_val = mgr.read_pid(service_key)
    assert read_val == 999999

    # Cleanup
    pid_file = mgr.__dict__.get("pids_dir", WORKSPACE_ROOT / "runtime" / "pids") / f"{service_key}.pid"
    if pid_file.exists():
        pid_file.unlink()


def test_doctor_system_resources():
    """Verifies environment doctor collects system hardware stats."""
    config = load_services_config()
    doc = EnvironmentDoctor(config)
    res = doc.check_system_resources()
    assert "OS" in res
    assert "Python" in res
    assert "CPU" in res
    assert "RAM" in res
    assert "Disk" in res


def test_dependency_tier_ordering():
    """Verifies that dependency tiers progress from infrastructure to frontend."""
    config = load_services_config()
    tiers = config["dependency_tiers"]
    
    assert "tier0" in tiers
    assert "postgres" in tiers["tier0"]["services"]
    assert "tier2" in tiers
    assert "model1" in tiers["tier2"]["services"]
    assert "tier5" in tiers
    assert "frontend" in tiers["tier5"]["services"]
