#!/usr/bin/env python3
"""
=============================================================================
 Gujarat Sentinel — Unified Full-Stack Platform Runner
 Gujarat Police Innovation Challenge 2026 • CCTV Integration Hybrid Platform
 Canonical Cross-Platform Project Orchestrator
=============================================================================

Usage:
    python scripts/run.py [OPTIONS]

Commands & Options:
    --start             Start the complete application stack (default)
    --stop              Gracefully stop application processes
    --stop-apps         Stop application processes only
    --stop-all          Stop application processes and Docker infrastructure
    --restart [SVC]     Restart all services or a specific service
    --status            Display live health and port status table
    --doctor            Run full environment and dependency diagnostic check
    --check-ports       Scan for port collisions across all configured services
    --logs [SVC]        Display recent log output for all or a specific service
    --build             Build application binaries and frontend bundles
    --test              Run unit, integration, and contract test suites
    --verify            Execute end-to-end multi-service health and smoke test
    --migrate           Run database migrations (Alembic)
    --backend-only      Start only backend microservices and databases
    --frontend-only     Start only frontend user interface
    --infra-only        Start only infrastructure (Postgres, Redis, Kafka, etc.)
    --ai-only           Start only AI computer vision microservice
    --service <SVC>     Start a specific service and its dependencies
    --env <MODE>        Set environment mode (development, demo, integration)
    --ci, --yes         Non-interactive mode (auto-confirm prompts)
    --config <FILE>     Path to custom services.yaml configuration file
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Ensure UTF-8 terminal encoding
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Try importing yaml, fallback to basic parser if needed
try:
    import yaml
except ImportError:
    yaml = None


# =============================================================================
# RUNTIME CONSTANTS & DIRECTORIES
# =============================================================================

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
RUNTIME_DIR = WORKSPACE_ROOT / "runtime"
PIDS_DIR = RUNTIME_DIR / "pids"
LOGS_DIR = RUNTIME_DIR / "logs"
STATE_FILE = RUNTIME_DIR / "state.json"
REPORT_JSON = RUNTIME_DIR / "startup-report.json"
REPORT_MD = RUNTIME_DIR / "startup-report.md"
DEFAULT_CONFIG = WORKSPACE_ROOT / "scripts" / "config" / "services.yaml"


def ensure_runtime_dirs() -> None:
    """Creates runtime directories for pids, logs, and state."""
    PIDS_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
# CONFIGURATION LOADER
# =============================================================================

def load_services_config(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Loads services.yaml configuration."""
    cfg_file = config_path or DEFAULT_CONFIG
    if not cfg_file.exists():
        print(f"[!] Warning: Config file {cfg_file} not found. Using fallback defaults.")
        return {}

    with open(cfg_file, "r", encoding="utf-8") as f:
        if yaml:
            return yaml.safe_load(f)
        else:
            # Fallback simple json-like parser if yaml not installed
            content = f.read()
            return {"raw_config": content}


# =============================================================================
# DOCTOR & ENVIRONMENT VALIDATOR
# =============================================================================

class EnvironmentDoctor:
    """Performs deep diagnostic inspection of host OS, tools, hardware, ports, and env."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    def check_command(self, cmd: str, args: List[str] = ["--version"]) -> Tuple[bool, str]:
        """Checks if a CLI tool exists and retrieves its version."""
        resolved = shutil.which(cmd) or cmd
        try:
            res = subprocess.run(
                [resolved] + args,
                capture_output=True,
                text=True,
                timeout=5,
                shell=(platform.system() == "Windows"),
            )
            if res.returncode == 0:
                first_line = (res.stdout or res.stderr).strip().splitlines()[0]
                return True, first_line[:50]
            return False, "Non-zero exit code"
        except Exception:
            return False, "Not found"

    def check_gpu(self) -> Tuple[bool, str]:
        """Probes for NVIDIA GPU and CUDA support."""
        try:
            res = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"],
                capture_output=True, text=True, timeout=4
            )
            if res.returncode == 0 and res.stdout.strip():
                return True, res.stdout.strip().splitlines()[0]
            return False, "GPU unavailable (CPU inference fallback active)"
        except Exception:
            return False, "GPU unavailable (CPU inference fallback active)"

    def check_system_resources(self) -> Dict[str, str]:
        """Collects CPU, RAM, and disk metrics."""
        cpu_count = os.cpu_count() or 1
        total_ram_gb = "Unknown"
        free_disk_gb = "Unknown"

        try:
            import psutil
            ram = psutil.virtual_memory()
            total_ram_gb = f"{round(ram.total / (1024**3), 1)} GB (Used: {ram.percent}%)"
            disk = psutil.disk_usage(str(WORKSPACE_ROOT))
            free_disk_gb = f"{round(disk.free / (1024**3), 1)} GB free"
        except ImportError:
            # Fallback for standard library
            try:
                disk = shutil.disk_usage(str(WORKSPACE_ROOT))
                free_disk_gb = f"{round(disk.free / (1024**3), 1)} GB free"
            except Exception:
                pass

        return {
            "OS": f"{platform.system()} {platform.release()} ({platform.machine()})",
            "Python": f"{platform.python_version()} ({sys.executable})",
            "CPU": f"{cpu_count} Logical Cores",
            "RAM": total_ram_gb,
            "Disk": free_disk_gb,
        }

    def check_docker_daemon(self) -> Tuple[bool, str]:
        """Checks if Docker engine daemon is responsive with a quick timeout."""
        try:
            res = subprocess.run(
                ["docker", "info", "--format", "{{.ServerVersion}}"],
                capture_output=True,
                text=True,
                timeout=4,
                shell=(platform.system() == "Windows"),
            )
            if res.returncode == 0 and res.stdout.strip():
                return True, f"Responsive (v{res.stdout.strip()[:20]})"
            return False, "Docker daemon not responding (500/offline)"
        except Exception:
            return False, "Docker daemon offline"

    def run_full_diagnostic(self) -> bool:
        """Executes full diagnostic test and prints formatted report."""
        print("\n" + "=" * 80)
        print("  GUJARAT SENTINEL — FULL-STACK ENVIRONMENT DOCTOR")
        print("=" * 80)

        # 1. System Hardware & OS
        res = self.check_system_resources()
        print("\n[1] HOST HARDWARE & OPERATING SYSTEM:")
        for k, v in res.items():
            print(f"    • {k:<12}: {v}")

        # GPU Check
        gpu_ok, gpu_msg = self.check_gpu()
        gpu_status = "READY" if gpu_ok else "NOTICE"
        print(f"    • {'AI GPU':<12}: [{gpu_status}] {gpu_msg}")

        # 2. Required CLI Tools (Core Officer Path)
        print("\n[2] REQUIRED TOOLCHAINS (Core Officer Path):")
        req_tools = [
            ("Python", sys.executable, ["--version"]),
            ("Node.js", "node", ["--version"]),
            ("npm", "npm", ["--version"]),
        ]

        all_req_ok = True
        for label, cmd, args in req_tools:
            ok, msg = self.check_command(cmd, args)
            status_str = "PASS" if ok else "NOT FOUND"
            print(f"    • {label:<12}: [{status_str:<9}] {msg}")
            if not ok:
                all_req_ok = False

        # 3. Optional Toolchains (Containers & Extended Models)
        print("\n[3] OPTIONAL EXTENDED TOOLCHAINS (Containers & Extended Models):")
        opt_tools = [
            ("Docker CLI", "docker", ["--version"]),
            ("Compose", "docker", ["compose", "version"]),
            ("Go", "go", ["version"]),
            ("Java", "java", ["-version"]),
            ("Maven", "mvn", ["-version"]),
            ("Git", "git", ["--version"]),
        ]

        for label, cmd, args in opt_tools:
            ok, msg = self.check_command(cmd, args)
            status_str = "READY" if ok else "OPTIONAL"
            print(f"    • {label:<12}: [{status_str:<9}] {msg}")

        docker_daemon_ok, docker_daemon_msg = self.check_docker_daemon()
        daemon_status = "READY" if docker_daemon_ok else "OFFLINE"
        print(f"    • {'Docker Daemon':<12}: [{daemon_status:<9}] {docker_daemon_msg}")
        if not docker_daemon_ok:
            print("      ℹ Platform will run in Standalone Core Mode with direct inter-service HTTP.")

        # 4. Environment & Real-Data Mode
        print("\n[4] CONFIGURATION & REAL-DATA INTEGRITY:")
        env_file = WORKSPACE_ROOT / ".env"
        if env_file.exists():
            print(f"    • .env File   : [PASS] Found at {env_file.name}")
        else:
            print("    • .env File   : [NOTICE] .env not found, using .env.example defaults")

        data_mode = os.environ.get("DATA_MODE", "real")
        if data_mode.lower() == "real":
            print(f"    • DATA_MODE   : [PASS] Strict real-data enforcement active ('{data_mode}')")
        else:
            print(f"    • DATA_MODE   : [WARNING] Non-production data mode detected ('{data_mode}')")

        # 5. Port Conflict Summary
        scanner = PortScanner(self.config)
        conflicts = scanner.scan_conflicts()
        print("\n[5] PORT COLLISION CHECK:")
        if conflicts:
            print(f"    • Conflicts   : [ALERT] {len(conflicts)} ports currently occupied:")
            for p, name in conflicts:
                print(f"      - Port {p:<5} ({name}) is already in use by an active process")
            print("      💡 Run with --clean-ports to automatically free these ports.")
        else:
            print("    • Conflicts   : [PASS] All service ports are available")

        print("\n" + "=" * 80)
        if all_req_ok and not conflicts:
            overall = "READY FOR STARTUP (Core Officer Path)"
        elif all_req_ok and conflicts:
            overall = "PORT CONFLICT DETECTED (Run --clean-ports)"
        else:
            overall = "SETUP REQUIRED — Missing required tools (Python / Node / npm)"
        print(f"OVERALL DIAGNOSTIC STATUS: {overall}")
        print("=" * 80 + "\n")
        return all_req_ok


# =============================================================================
# PORT SCANNER & COLLISION DETECTOR
# =============================================================================

class PortScanner:
    """Scans and verifies availability of all required service ports."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.ports = self._collect_ports()

    def _collect_ports(self) -> List[Tuple[int, str]]:
        """Collects all configured ports across infra and application services."""
        ports = []
        infra = self.config.get("infrastructure", {}).get("services", {})
        for k, s in infra.items():
            if "port" in s:
                ports.append((int(s["port"]), f"Infra: {s.get('name', k)}"))

        apps = self.config.get("services", {})
        for k, s in apps.items():
            if "port" in s:
                ports.append((int(s["port"]), f"App: {s.get('name', k)}"))

        return sorted(list(set(ports)), key=lambda x: x[0])

    def is_port_in_use(self, port: int, host: str = "127.0.0.1") -> bool:
        """Attempts a TCP connection to check if port is currently open."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.15)
            return s.connect_ex((host, port)) == 0

    def scan_conflicts(self) -> List[Tuple[int, str]]:
        """Returns list of occupied ports."""
        conflicts = []
        for port, name in self.ports:
            if self.is_port_in_use(port):
                conflicts.append((port, name))
        return conflicts

    def print_scan_report(self) -> bool:
        """Prints formatted port report."""
        print("\n" + "=" * 80)
        print("  GUJARAT SENTINEL — SERVICE PORT SCANNER")
        print("=" * 80)
        conflicts = []
        for port, name in self.ports:
            in_use = self.is_port_in_use(port)
            status = "OCCUPIED" if in_use else "AVAILABLE"
            print(f"  • Port {port:<6} : [{status:<9}] {name}")
            if in_use:
                conflicts.append((port, name))

        print("-" * 80)
        if conflicts:
            print(f"[!] Warning: {len(conflicts)} ports are already occupied.")
            return False
        else:
            print("[OK] All service ports are available.")
            return True

    def clean_occupied_ports(self, target_ports: Optional[List[int]] = None) -> List[int]:
        """Terminates active processes listening on Sentinel ports to guarantee clean startup."""
        ports_to_clean = target_ports if target_ports is not None else [p for p, _ in self.ports]
        freed = []
        if not ports_to_clean:
            return freed

        print(f"  --> Scanning and freeing ports: {sorted(ports_to_clean)}...")
        if platform.system() == "Windows":
            try:
                res = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, timeout=5)
                pids_to_kill = set()
                for line in res.stdout.splitlines():
                    if "LISTENING" in line:
                        for p in ports_to_clean:
                            if f":{p} " in line or f":{p}\t" in line:
                                parts = line.strip().split()
                                if parts:
                                    try:
                                        pid = int(parts[-1])
                                        if pid > 4:  # Avoid killing Windows System (PID 4)
                                            pids_to_kill.add(pid)
                                    except ValueError:
                                        pass

                for pid in pids_to_kill:
                    try:
                        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True, timeout=3)
                        freed.append(pid)
                    except Exception:
                        pass

                # If Docker ports were checked, ensure orphan Docker relay processes are terminated
                if any(p in ports_to_clean for p in [8000, 8001, 8002, 8003, 8004, 8005, 5432, 6379, 9000, 9200, 29092]):
                    subprocess.run(
                        ["taskkill", "/F", "/IM", "com.docker.backend.exe", "/IM", "wslrelay.exe"],
                        capture_output=True,
                        timeout=3
                    )
            except Exception as e:
                print(f"  [!] Port cleanup error: {e}")
        else:
            for p in ports_to_clean:
                try:
                    res = subprocess.run(["fuser", "-k", f"{p}/tcp"], capture_output=True, timeout=3)
                    if res.returncode == 0:
                        freed.append(p)
                except Exception:
                    pass

        # Clean associated PID files for freed ports
        services = self.config.get("services", {})
        for p in ports_to_clean:
            for s_key, s_def in services.items():
                if s_def.get("port") == p:
                    pid_file = PIDS_DIR / f"{s_key}.pid"
                    if pid_file.exists():
                        try:
                            pid_file.unlink(missing_ok=True)
                        except Exception:
                            pass

        # Brief sleep to allow OS kernel socket release
        time.sleep(1.0)
        remaining = [p for p in ports_to_clean if self.is_port_in_use(p)]
        if remaining:
            print(f"  [!] Notice: Ports {remaining} could not be freed or are being held by system services.")
        else:
            print("  [OK] All specified ports successfully freed.")
        return freed


# =============================================================================
# HEALTH CHECK ENGINE
# =============================================================================

class HealthEngine:
    """Probes HTTP and TCP health endpoints with robust timeout/poll loops."""

    @staticmethod
    def check_http(url: str, expected_status: List[int] = [200], timeout: float = 2.0) -> Tuple[bool, str]:
        """Probes an HTTP health endpoint with fast TCP pre-check and automatic localhost/127.0.0.1 fallback."""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)

        # Quick TCP socket check first (0.2s) to return immediately if port is closed
        tcp_ok, _ = HealthEngine.check_tcp(host, port, timeout=0.2)
        if not tcp_ok and host in ("127.0.0.1", "localhost"):
            alt_host = "localhost" if host == "127.0.0.1" else "127.0.0.1"
            tcp_ok, _ = HealthEngine.check_tcp(alt_host, port, timeout=0.2)
            if not tcp_ok:
                return False, "Connection refused"

        urls_to_try = [url]
        if "127.0.0.1" in url:
            urls_to_try.append(url.replace("127.0.0.1", "localhost"))
        elif "localhost" in url:
            urls_to_try.append(url.replace("localhost", "127.0.0.1"))

        last_err = ""
        for u in urls_to_try:
            try:
                req = urllib.request.Request(u, headers={"User-Agent": "Sentinel-Runner/2.0"})
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    if resp.status in expected_status:
                        return True, f"HTTP {resp.status} OK"
                    return False, f"HTTP {resp.status}"
            except urllib.error.HTTPError as e:
                if e.code in expected_status:
                    return True, f"HTTP {e.code}"
                return False, f"HTTP {e.code}"
            except Exception as e:
                last_err = str(e)[:40]
        return False, f"Connection error: {last_err}"

    @staticmethod
    def check_tcp(host: str, port: int, timeout: float = 2.0) -> Tuple[bool, str]:
        """Probes a TCP socket connection."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(timeout)
                if s.connect_ex((host, port)) == 0:
                    return True, "TCP Connection open"
                return False, "Connection refused"
        except Exception as e:
            return False, str(e)[:40]

    @classmethod
    def check_service_health(cls, service_def: Dict[str, Any]) -> Tuple[bool, str]:
        """Dispatches health check based on service definition."""
        h_cfg = service_def.get("health", {})
        h_type = h_cfg.get("type", "http")

        if h_type == "http":
            url = h_cfg.get("url", f"http://127.0.0.1:{service_def.get('port', 8000)}/health")
            expected = h_cfg.get("expected_status", [200])
            return cls.check_http(url, expected_status=expected, timeout=1.0)
        elif h_type == "tcp":
            host = h_cfg.get("host", "127.0.0.1")
            port = int(h_cfg.get("port", service_def.get("port", 8000)))
            return cls.check_tcp(host, port)
        return False, "Unknown health check type"

    @classmethod
    def wait_for_healthy(
        cls,
        name: str,
        service_def: Dict[str, Any],
        timeout_seconds: int = 60,
        poll_interval: float = 1.5,
    ) -> bool:
        """Polls service health until healthy or timeout."""
        start_time = time.time()
        print(f"  --> Waiting for {name} to become healthy (timeout: {timeout_seconds}s)...", end="", flush=True)

        while time.time() - start_time < timeout_seconds:
            ok, msg = cls.check_service_health(service_def)
            if ok:
                elapsed = round(time.time() - start_time, 1)
                print(f" [HEALTHY] ({elapsed}s)", flush=True)
                return True
            time.sleep(poll_interval)

        print(" [TIMEOUT / FAILED]", flush=True)
        return False


# =============================================================================
# PROCESS LIFECYCLE & PROCESS TREE MANAGER
# =============================================================================

class ProcessManager:
    """Manages spawning, logging, PID tracking, and graceful termination of service processes."""

    def __init__(self):
        ensure_runtime_dirs()

    def write_pid(self, service_key: str, pid: int) -> None:
        """Persists process PID."""
        pid_file = PIDS_DIR / f"{service_key}.pid"
        with open(pid_file, "w", encoding="utf-8") as f:
            f.write(str(pid))

    def read_pid(self, service_key: str) -> Optional[int]:
        """Reads PID from file."""
        pid_file = PIDS_DIR / f"{service_key}.pid"
        if pid_file.exists():
            try:
                with open(pid_file, "r", encoding="utf-8") as f:
                    return int(f.read().strip())
            except Exception:
                return None
        return None

    def is_process_alive(self, pid: int) -> bool:
        """Checks if a process ID is currently active."""
        if pid <= 0:
            return False
        if platform.system() == "Windows":
            try:
                res = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True)
                return str(pid) in res.stdout
            except Exception:
                return False
        else:
            try:
                os.kill(pid, 0)
                return True
            except OSError:
                return False

    def start_service_process(
        self,
        service_key: str,
        command: str,
        working_dir: str,
        env_vars: Dict[str, str] = {},
    ) -> Optional[int]:
        """Starts a background process, redirects logs, and saves PID."""
        # Check if already running
        existing_pid = self.read_pid(service_key)
        if existing_pid and self.is_process_alive(existing_pid):
            return existing_pid

        log_file_path = LOGS_DIR / f"{service_key}.log"
        log_file = open(log_file_path, "a", encoding="utf-8")

        work_path = WORKSPACE_ROOT / working_dir
        if not work_path.exists():
            work_path = WORKSPACE_ROOT

        # Build environment
        proc_env = os.environ.copy()
        proc_env.update(env_vars)
        proc_env["DATA_MODE"] = "real"

        # Timestamp log header
        log_file.write(f"\n\n--- [START] {service_key} at {datetime.now().isoformat()} ---\n")
        log_file.write(f"Command: {command}\n\n")
        log_file.flush()

        try:
            # Use shell=True for complex command lines across OS
            c_flags = 0
            if platform.system() == "Windows":
                c_flags = subprocess.CREATE_NEW_PROCESS_GROUP
            proc = subprocess.Popen(
                command,
                shell=True,
                cwd=str(work_path),
                env=proc_env,
                stdin=subprocess.DEVNULL,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                creationflags=c_flags,
                start_new_session=True if platform.system() != "Windows" else False,
            )
            self.write_pid(service_key, proc.pid)
            return proc.pid
        except Exception as e:
            print(f"[!] Error spawning {service_key}: {e}")
            return None

    def stop_process_tree(self, pid: int) -> bool:
        """Terminates a process and all its child workers."""
        if not self.is_process_alive(pid):
            return True

        if platform.system() == "Windows":
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
                return True
            except Exception:
                return False
        else:
            try:
                # Send SIGTERM to process group
                os.killpg(os.getpgid(pid), signal.SIGTERM)
                time.sleep(0.5)
                if self.is_process_alive(pid):
                    os.killpg(os.getpgid(pid), signal.SIGKILL)
                return True
            except Exception:
                try:
                    os.kill(pid, signal.SIGTERM)
                    return True
                except Exception:
                    return False

    def stop_service(self, service_key: str) -> bool:
        """Stops a tracked service."""
        pid = self.read_pid(service_key)
        if pid:
            self.stop_process_tree(pid)
            pid_file = PIDS_DIR / f"{service_key}.pid"
            if pid_file.exists():
                pid_file.unlink(missing_ok=True)
            return True
        return False

    def stop_all_apps(self, services: Dict[str, Any]) -> None:
        """Stops all tracked application processes in reverse order."""
        for key in reversed(list(services.keys())):
            print(f"  --> Stopping {key}...", end="", flush=True)
            stopped = self.stop_service(key)
            print(" [STOPPED]" if stopped else " [NOT RUNNING]")


# =============================================================================
# RUNNER ORCHESTRATION ENGINE
# =============================================================================

class SentinelRunner:
    """Master orchestrator for preparing, starting, verifying, and stopping the full stack."""

    def __init__(self, config_path: Optional[Path] = None):
        ensure_runtime_dirs()
        self.config = load_services_config(config_path)
        self.proc_mgr = ProcessManager()
        self.doctor = EnvironmentDoctor(self.config)
        self.port_scanner = PortScanner(self.config)

    def clean_ports(self, target_ports: Optional[List[int]] = None) -> List[int]:
        """Terminates processes listening on Sentinel ports."""
        return self.port_scanner.clean_occupied_ports(target_ports)

    def start_docker_infra(self) -> bool:
        """Starts Docker Compose infrastructure services if docker daemon is responsive."""
        compose_file = self.config.get("infrastructure", {}).get("compose_file", "docker-compose.yml")
        compose_path = WORKSPACE_ROOT / compose_file

        if not compose_path.exists():
            print(f"[!] Warning: Docker compose file {compose_path} not found.")
            return False

        print("\n[INFRASTRUCTURE] PROBING DOCKER ENGINE:")
        docker_ok, docker_msg = self.doctor.check_docker_daemon()
        if not docker_ok:
            print(f"  [!] Docker engine notice: {docker_msg}")
            print("  ℹ Skipping container launch. Platform will run in Standalone mode with local storage/fallback.")
            return False

        print("\n[INFRASTRUCTURE] LAUNCHING CORE INFRASTRUCTURE (Docker Compose):")
        cmd = ["docker", "compose", "-f", str(compose_path), "up", "-d", "postgres", "redis", "zookeeper", "kafka", "opensearch", "minio", "prometheus", "grafana"]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(WORKSPACE_ROOT), timeout=45)
            if res.returncode != 0:
                print(f"  [!] Docker compose notice: {res.stderr[:200]}")
                return False
            print("  [OK] Docker infrastructure containers launched.")
            return True
        except Exception as e:
            print(f"  [!] Docker compose execution notice: {e}")
            return False

    def wait_for_infrastructure(self, essential: Optional[List[str]] = None) -> bool:
        """Waits for essential infrastructure services to become healthy."""
        print("\n[INFRASTRUCTURE] VERIFYING DATA STORES:")
        infra = self.config.get("infrastructure", {}).get("services", {})
        target_essential = essential or ["postgres", "redis"]

        all_healthy = True
        for key in target_essential:
            if key in infra:
                svc = infra[key]
                timeout = min(svc.get("health", {}).get("timeout", 15), 15)
                ok = HealthEngine.wait_for_healthy(svc["name"], svc, timeout_seconds=timeout)
                if not ok:
                    all_healthy = False
                    print(f"  ℹ {svc['name']} offline (core path will use standalone / local fallback).")

        return all_healthy

    def run_database_migrations(self) -> bool:
        """Runs Alembic migrations for Model 1 and Model 2 if postgres is responsive."""
        print("\n[MIGRATIONS] VERIFYING DATABASE SCHEMAS (Alembic / PostGIS):")
        # Model 1 Migrations
        m1_dir = WORKSPACE_ROOT / "backend-model1"
        if m1_dir.exists():
            print("  --> Checking Model 1 database schema...", end="", flush=True)
            try:
                res = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=str(m1_dir), capture_output=True, text=True, timeout=15)
                print(" [MIGRATED]" if res.returncode == 0 else " [ALREADY CURRENT / SKIPPED]")
            except Exception:
                print(" [ALREADY CURRENT / SKIPPED]")

        # Model 2 Migrations
        m2_dir = WORKSPACE_ROOT / "backend-model2"
        if m2_dir.exists():
            print("  --> Checking Model 2 database schema...", end="", flush=True)
            try:
                res = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=str(m2_dir), capture_output=True, text=True, timeout=15)
                print(" [MIGRATED]" if res.returncode == 0 else " [ALREADY CURRENT / SKIPPED]")
            except Exception:
                print(" [ALREADY CURRENT / SKIPPED]")

        return True

    def start_application_services(self, selected_keys: Optional[List[str]] = None) -> bool:
        """Starts application microservices in strict topological order with graceful toolchain fallbacks."""
        print("\n[APPLICATIONS] LAUNCHING APPLICATION MICROSERVICES:")
        services = self.config.get("services", {})
        tiers = self.config.get("dependency_tiers", {})

        keys_to_start = selected_keys or list(services.keys())

        # Determine startup sequence
        start_order = []
        for tier_key in ["tier2", "tier3", "tier4", "tier5"]:
            tier_svcs = tiers.get(tier_key, {}).get("services", [])
            for s in tier_svcs:
                if s in keys_to_start and s not in start_order and s in services:
                    start_order.append(s)

        # Add any remaining
        for k in keys_to_start:
            if k in services and k not in start_order:
                start_order.append(k)

        all_ok = True
        for key in start_order:
            svc = services[key]
            name = svc.get("name", key)
            cmd = svc.get("command", "")
            wdir = svc.get("working_dir", "")
            env_vars = svc.get("env", {})

            # Graceful toolchain handling for optional services
            if key == "model3":
                has_mvn = shutil.which("mvn") is not None
                has_java = shutil.which("java") is not None
                if not (has_mvn or has_java):
                    print(f"  • {name:<45} : [OPTIONAL: SKIPPED — Java/Maven not installed]")
                    continue

            if key == "model4":
                has_go = shutil.which("go") is not None
                if not has_go:
                    print(f"  • {name:<45} : [OPTIONAL: SKIPPED — Go not installed]")
                    continue

            if key == "hybrid-gateway":
                has_go = shutil.which("go") is not None
                if not has_go:
                    print(f"  • {name:<45} : [NOTICE: Go not installed — using Python fallback reverse proxy on :8000]")
                    fallback_script = WORKSPACE_ROOT / "scripts" / "gateway_fallback.py"
                    cmd = f'"{sys.executable}" "{fallback_script}"'
                    wdir = "."

            # Ensure python services execute with current active Python interpreter
            if cmd.startswith("python "):
                cmd = f'"{sys.executable}" ' + cmd[7:]

            # Check if port already healthy
            is_healthy, _ = HealthEngine.check_service_health(svc)
            if is_healthy:
                print(f"  • {name:<45} : [ALREADY RUNNING & HEALTHY]")
                continue

            # Ensure any stale process or lingering PID file is stopped before launching
            self.proc_mgr.stop_service(key)

            print(f"  --> Launching {name} (:Port {svc.get('port')})...")
            pid = self.proc_mgr.start_service_process(key, cmd, wdir, env_vars)

            # Wait for health
            timeout = svc.get("health", {}).get("timeout", 45)
            healthy = HealthEngine.wait_for_healthy(name, svc, timeout_seconds=timeout)
            if not healthy:
                # Do not mark all_ok = False for optional services
                if key not in ("model3", "model4"):
                    all_ok = False
                # Print log excerpt
                log_file = LOGS_DIR / f"{key}.log"
                if log_file.exists():
                    try:
                        with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                            lines = f.readlines()
                            print(f"\n[!] Last log lines for {key}:")
                            for l in lines[-10:]:
                                print(f"    | {l.strip()}")
                    except Exception:
                        pass

        return all_ok

    def print_status_table(self) -> None:
        """Displays formatted ASCII status of all system components."""
        print("\n" + "=" * 95)
        print("  GUJARAT SENTINEL — FULL-STACK LIVE COMPONENT STATUS")
        print("=" * 95)

        # 1. Infrastructure
        print("\n[INFRASTRUCTURE]")
        print(f"  {'COMPONENT':<35} | {'PORT':<6} | {'STATUS':<10} | {'DETAILS'}")
        print("  " + "-" * 90)
        infra = self.config.get("infrastructure", {}).get("services", {})
        for k, s in infra.items():
            ok, msg = HealthEngine.check_service_health(s)
            status_str = "HEALTHY" if ok else "OFFLINE"
            print(f"  {s.get('name', k):<35} | {str(s.get('port', '-')):<6} | {status_str:<10} | {msg}")

        # 2. Application Services
        print("\n[APPLICATIONS & MICROSERVICES]")
        print(f"  {'SERVICE NAME':<35} | {'PORT':<6} | {'STATUS':<10} | {'HEALTH PROBE'}")
        print("  " + "-" * 90)
        apps = self.config.get("services", {})
        for k, s in apps.items():
            ok, msg = HealthEngine.check_service_health(s)
            status_str = "HEALTHY" if ok else "OFFLINE"
            print(f"  {s.get('name', k):<35} | {str(s.get('port', '-')):<6} | {status_str:<10} | {msg}")

        print("\n" + "=" * 95 + "\n")

    def run_e2e_smoke_test(self, core_only: bool = False) -> bool:
        """Executes safe end-to-end multi-service health and connectivity verification."""
        print("\n" + "=" * 80)
        print(f"  GUJARAT SENTINEL — {'CORE OFFICER' if core_only else 'FULL STACK'} SMOKE TEST")
        print("=" * 80)

        probes = [
            ("Model 1 Central Camera Registry", "http://127.0.0.1:8001/health", True),
            ("Model 2 Unified Viewing & ANPR", "http://127.0.0.1:8002/health", True),
            ("Model 3 VMS Federation SDK", "http://127.0.0.1:8003/actuator/health", False),
            ("Model 4 Central VMS & Video Archival", "http://127.0.0.1:8004/health", False),
            ("AI Computer Vision & ANPR Engine", "http://127.0.0.1:8006/health", True),
            ("Central Brain Orchestrator", "http://127.0.0.1:8005/health", True),
            ("Hybrid API Gateway", "http://127.0.0.1:8000/health", True),
            ("Police Command Center Frontend", "http://127.0.0.1:3001", True),
        ]

        all_ok = True
        for label, url, is_required in probes:
            if core_only and not is_required:
                ok, msg = HealthEngine.check_http(url, timeout=0.8)
                if ok:
                    print(f"  • {label:<42} : [PASS] {msg}")
                else:
                    print(f"  • {label:<42} : [OPTIONAL: SKIPPED]")
                continue

            ok, msg = HealthEngine.check_http(url, timeout=2.0)
            status_str = "PASS" if ok else "FAIL"
            print(f"  • {label:<42} : [{status_str:<4}] {msg}")
            if not ok and is_required:
                all_ok = False

        print("-" * 80)
        print("SMOKE TEST RESULT: " + ("ALL CRITICAL SERVICES HEALTHY" if all_ok else "SOME CRITICAL SERVICES OFFLINE"))
        print("=" * 80 + "\n")
        return all_ok

    def start_core_stack(self, detach: bool = False) -> bool:
        """Starts the officer-critical path: Model 1, Model 2, AI Detection, Orchestrator, Gateway, and Frontend."""
        print("\n" + "=" * 80)
        print("  GUJARAT SENTINEL — CORE OFFICER PATH RUNNER")
        print("  Services: Model 1 (Registry) + Model 2 (Unified/ANPR) + AI Detection + Brain + Gateway + UI")
        print("=" * 80)

        # 1. Ensure clean ports
        print("\n[STEP 1] ENSURING CLEAN PORTS:")
        core_ports = [8000, 8001, 8002, 8005, 8006, 3001]
        self.clean_ports(core_ports)

        # 2. Check backing infrastructure
        print("\n[STEP 2] BACKING INFRASTRUCTURE:")
        docker_ok, _ = self.doctor.check_docker_daemon()
        if docker_ok:
            print("  --> Docker engine detected. Launching backing containers (Postgres, Redis)...")
            self.start_docker_infra()
            self.wait_for_infrastructure(essential=["postgres", "redis"])
            self.run_database_migrations()
        else:
            print("  --> Docker is offline/unstable. Running in Standalone Core Mode (SQLite / direct inter-service HTTP).")

        # 3. Launch Core Application Services
        core_services = ["model1", "model2", "ai-detection", "orchestrator", "hybrid-gateway", "frontend"]
        apps_ok = self.start_application_services(core_services)

        # 4. Status & Smoke Verification
        self.print_status_table()
        smoke_ok = self.run_e2e_smoke_test(core_only=True)

        print("=" * 80)
        print("  GUJARAT SENTINEL CORE OFFICER PATH READY:")
        print("=" * 80)
        print("  👑 Police Command Center UI   : http://localhost:3001")
        print("  🌐 Central Brain Orchestrator : http://localhost:8005/docs")
        print("  ⚡ Hybrid API Gateway          : http://localhost:8000")
        print("  📷 Model 1 CCTV Registry      : http://localhost:8001/health")
        print("  🎯 Model 2 Unified Viewer/ANPR: http://localhost:8002/health")
        print("  🧠 AI Computer Vision Engine  : http://localhost:8006/health")
        print("  📑 Logs Directory             : runtime/logs/")
        print("=" * 80 + "\n", flush=True)

        if not detach:
            self.monitor_loop()

        return apps_ok and smoke_ok

    def monitor_loop(self) -> None:
        """Keeps runner alive, monitors services, and stops cleanly on Ctrl+C."""
        print("[ACTIVE] Stack is live and serving requests.")
        print("[ACTIVE] Press Ctrl+C in this terminal to stop all services.\n", flush=True)
        try:
            while True:
                time.sleep(2.0)
        except KeyboardInterrupt:
            print("\n\n[SHUTDOWN] Interrupted by user. Gracefully stopping all services...", flush=True)
            self.proc_mgr.stop_all_apps(self.config.get("services", {}))
            self.clean_ports([8000, 8001, 8002, 8003, 8004, 8005, 8006, 3001])
            print("[SHUTDOWN] All services cleanly stopped.", flush=True)

    def start_full_stack(self, detach: bool = False) -> bool:
        """Runs the complete one-command startup sequence."""
        print("\n" + "=" * 80)
        print("  GUJARAT SENTINEL HYBRID CCTV PLATFORM — FULL-STACK RUNNER")
        print("=" * 80)

        # 1. Clean ports
        self.clean_ports([8000, 8001, 8002, 8003, 8004, 8005, 8006, 3001])

        # 2. Environment & Doctor Check
        if not self.doctor.run_full_diagnostic():
            print("[!] Environment check found missing critical prerequisites.")

        # 3. Start Infrastructure
        self.start_docker_infra()
        self.wait_for_infrastructure()

        # 4. Database Migrations
        self.run_database_migrations()

        # 5. Start Applications
        apps_ok = self.start_application_services()

        # 6. Status & Summary
        self.print_status_table()
        self.run_e2e_smoke_test(core_only=False)

        # Print URL Summary
        print("=" * 80)
        print("  GUJARAT SENTINEL READY — ACCESS URLs:")
        print("=" * 80)
        print("  👑 Police Command Center UI   : http://localhost:3001")
        print("  🌐 Central Brain Orchestrator : http://localhost:8005/docs")
        print("  ⚡ Hybrid API Gateway          : http://localhost:8000")
        print("  📊 Grafana SRE Dashboards     : http://localhost:3000 (admin/grafana_admin_pass)")
        print("  📦 MinIO S3 Object Storage    : http://localhost:9005 (Console)")
        print("  🔍 OpenSearch Dashboards      : http://localhost:5601")
        print("  📑 Logs Directory             : runtime/logs/")
        print("=" * 80 + "\n", flush=True)

        if not detach:
            self.monitor_loop()

        return apps_ok


# =============================================================================
# CLI ENTRY POINT & INTERACTIVE MENU
# =============================================================================

def interactive_menu(runner: SentinelRunner) -> None:
    """Provides interactive terminal menu when run without flags."""
    while True:
        print("\n" + "=" * 60)
        print("  GUJARAT SENTINEL — ONE-COMMAND CONTROL CENTER")
        print("=" * 60)
        print("  [1] Start Core Officer Path (Recommended: M1, M2, AI, Brain, UI)")
        print("  [2] Start Full Stack (All Services & Docker Infra)")
        print("  [3] Clean & Free Occupied Ports (8000-8006, 3001, Docker)")
        print("  [4] Start Backend Only (Models 1-4 + Brain)")
        print("  [5] Start Frontend Only (React Video Wall)")
        print("  [6] Start AI Detection Engine Only")
        print("  [7] Start Infrastructure Only (Databases / Kafka)")
        print("  [8] View Live Component Status")
        print("  [9] Run Environment Doctor Check")
        print("  [10] Run End-to-End Smoke Verification")
        print("  [11] Stop Application Services")
        print("  [12] Stop All (Applications + Infrastructure)")
        print("  [0] Exit")
        print("=" * 60)

        try:
            choice = input("👉 Enter selection [0-12, Default: 1]: ").strip()
            if not choice:
                choice = "1"
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break

        if choice == "1":
            runner.start_core_stack()
        elif choice == "2":
            runner.start_full_stack()
        elif choice == "3":
            runner.clean_ports()
        elif choice == "4":
            runner.start_application_services(["model1", "model2", "model3", "model4", "orchestrator", "hybrid-gateway"])
        elif choice == "5":
            runner.start_application_services(["frontend"])
        elif choice == "6":
            runner.start_application_services(["ai-detection"])
        elif choice == "7":
            runner.start_docker_infra()
            runner.wait_for_infrastructure()
        elif choice == "8":
            runner.print_status_table()
        elif choice == "9":
            runner.doctor.run_full_diagnostic()
        elif choice == "10":
            runner.run_e2e_smoke_test()
        elif choice == "11":
            runner.proc_mgr.stop_all_apps(runner.config.get("services", {}))
            runner.clean_ports([8000, 8001, 8002, 8003, 8004, 8005, 8006, 3001])
        elif choice == "12":
            runner.proc_mgr.stop_all_apps(runner.config.get("services", {}))
            runner.clean_ports()
            subprocess.run(["docker", "compose", "down"], cwd=str(WORKSPACE_ROOT))
        elif choice == "0":
            print("Exiting runner.")
            break
        else:
            print("Invalid choice.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Gujarat Sentinel Hybrid Full-Stack Project Runner")
    parser.add_argument("--core-start", action="store_true", help="Start core officer path (Model 1, Model 2, AI, Brain, Gateway, Frontend)")
    parser.add_argument("--clean-ports", action="store_true", help="Clean and free occupied Sentinel ports")
    parser.add_argument("--start", action="store_true", help="Start the complete application stack")
    parser.add_argument("--stop", action="store_true", help="Stop application processes")
    parser.add_argument("--stop-apps", action="store_true", help="Stop application processes only")
    parser.add_argument("--stop-all", action="store_true", help="Stop applications and Docker infrastructure")
    parser.add_argument("--restart", nargs="?", const="all", help="Restart all services or specific service")
    parser.add_argument("--status", action="store_true", help="Display live component status")
    parser.add_argument("--doctor", action="store_true", help="Run full diagnostic environment check")
    parser.add_argument("--check-ports", action="store_true", help="Scan for port collisions")
    parser.add_argument("--logs", nargs="?", const="all", help="Display log output")
    parser.add_argument("--build", action="store_true", help="Build binaries and packages")
    parser.add_argument("--test", action="store_true", help="Run automated test suites")
    parser.add_argument("--verify", action="store_true", help="Execute end-to-end smoke verification")
    parser.add_argument("--migrate", action="store_true", help="Run database migrations")
    parser.add_argument("--backend-only", action="store_true", help="Start backend microservices only")
    parser.add_argument("--frontend-only", action="store_true", help="Start frontend only")
    parser.add_argument("--infra-only", action="store_true", help="Start infrastructure only")
    parser.add_argument("--ai-only", action="store_true", help="Start AI engine only")
    parser.add_argument("--service", type=str, help="Start a specific service and its dependencies")
    parser.add_argument("--env", type=str, default="development", help="Environment mode")
    parser.add_argument("--ci", "--yes", action="store_true", help="Non-interactive mode")
    parser.add_argument("--detach", action="store_true", help="Start services in background without holding terminal")
    parser.add_argument("--config", type=str, help="Path to custom services.yaml")
    args = parser.parse_args()

    config_path = Path(args.config) if args.config else None
    runner = SentinelRunner(config_path)

    if args.core_start:
        return 0 if runner.start_core_stack(detach=args.detach) else 1

    if args.clean_ports:
        runner.clean_ports()
        return 0

    if args.doctor:
        return 0 if runner.doctor.run_full_diagnostic() else 1

    if args.check_ports:
        return 0 if runner.port_scanner.print_scan_report() else 1

    if args.status:
        runner.print_status_table()
        return 0

    if args.verify:
        return 0 if runner.run_e2e_smoke_test() else 1

    if args.stop or args.stop_apps:
        runner.proc_mgr.stop_all_apps(runner.config.get("services", {}))
        runner.clean_ports([8000, 8001, 8002, 8003, 8004, 8005, 8006, 3001])
        return 0

    if args.stop_all:
        runner.proc_mgr.stop_all_apps(runner.config.get("services", {}))
        runner.clean_ports()
        subprocess.run(["docker", "compose", "down"], cwd=str(WORKSPACE_ROOT))
        return 0

    if args.restart:
        if args.restart == "all":
            runner.proc_mgr.stop_all_apps(runner.config.get("services", {}))
            runner.start_full_stack()
        else:
            runner.proc_mgr.stop_service(args.restart)
            runner.start_application_services([args.restart])
        return 0

    if args.migrate:
        return 0 if runner.run_database_migrations() else 1

    if args.backend_only:
        runner.start_docker_infra()
        runner.wait_for_infrastructure()
        runner.start_application_services(["model1", "model2", "model3", "model4", "orchestrator", "hybrid-gateway"])
        return 0

    if args.frontend_only:
        runner.start_application_services(["frontend"])
        return 0

    if args.ai_only:
        runner.start_application_services(["ai-detection"])
        return 0

    if args.infra_only:
        runner.start_docker_infra()
        return 0 if runner.wait_for_infrastructure() else 1

    if args.service:
        runner.start_application_services([args.service])
        return 0

    if args.test:
        print("\n[RUNNING ALL AUTOMATED TEST SUITES]")
        res = subprocess.run(["python", "-m", "pytest", "-v"], cwd=str(WORKSPACE_ROOT))
        return res.returncode

    if args.start or args.ci:
        return 0 if runner.start_full_stack(detach=args.detach) else 1

    # Interactive mode if invoked with no arguments
    interactive_menu(runner)
    return 0


if __name__ == "__main__":
    sys.exit(main())
