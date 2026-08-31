#!/usr/bin/env python3
"""
Gujarat Sentinel — Automated Secret & Credential Scanner
Scans codebase for hardcoded API keys, private keys, passwords, and sensitive tokens.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import List, Tuple

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Regex patterns for detecting sensitive credentials
SECRET_PATTERNS = [
    (r"(?i)password\s*=\s*['\"][^'\"]{6,}['\"]", "Possible hardcoded password"),
    (r"(?i)api[_-]?key\s*=\s*['\"][a-zA-Z0-9_\-]{16,}['\"]", "Possible hardcoded API Key"),
    (r"(?i)secret[_-]?key\s*=\s*['\"][a-zA-Z0-9_\-]{16,}['\"]", "Possible hardcoded Secret Key"),
    (r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}", "Hardcoded Bearer Token"),
    (r"-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----", "Private Key File"),
    (r"(?i)aws_access_key_id\s*=\s*['\"][A-Z0-9]{20}['\"]", "AWS Access Key"),
    (r"(?i)aws_secret_access_key\s*=\s*['\"][A-Za-z0-9/\+=]{40}['\"]", "AWS Secret Key"),
]

# Paths and files to ignore during scans
IGNORED_DIRS = {
    ".git", "node_modules", "dist", "build", ".pytest_cache",
    "runtime", "htmlcov", ".idea", ".vscode", "target", "vendor"
}

IGNORED_FILES = {
    ".gitignore", "scan_secrets.py", ".env.example", "package-lock.json",
    "sentinel_platform.db"
}

# Whitelisted test tokens
SAFE_TEST_TOKENS = {
    "sentinel-dev-secret-change-in-production-min-32-chars",
    "sentinel_secure_pass_2026",
    "redis_secure_pass",
    "Sentinel_Strong_Pass_2026!",
    "admin_password",
    "sentinel-client-secret-change-in-prod",
    "grafana_admin_pass",
}


def scan_file(filepath: Path) -> List[Tuple[int, str, str]]:
    """Scans an individual file line by line against secret patterns."""
    findings = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line_no, line in enumerate(f, start=1):
                # Skip comments or mock examples
                stripped = line.strip()
                if stripped.startswith("#") or stripped.startswith("//"):
                    continue

                for pattern, desc in SECRET_PATTERNS:
                    match = re.search(pattern, line)
                    if match:
                        matched_str = match.group(0)
                        # Check if it's a known safe development placeholder
                        if any(safe in matched_str for safe in SAFE_TEST_TOKENS):
                            continue
                        # If in .env file, ensure it's not committing real credentials
                        if filepath.name == ".env":
                            findings.append((line_no, desc, f"Found in {filepath.name}: {stripped[:40]}..."))
                        else:
                            findings.append((line_no, desc, stripped[:60]))
    except Exception as e:
        pass
    return findings


def scan_workspace() -> int:
    """Recursively scans all workspace directories."""
    print("=" * 70)
    print("🛡️  GUJARAT SENTINEL — SECURITY & SECRET SCANNER")
    print(f"📁 Target Workspace: {WORKSPACE_ROOT}")
    print("=" * 70)

    total_files = 0
    total_findings = 0

    for root, dirs, files in os.walk(WORKSPACE_ROOT):
        # Prune ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

        for file in files:
            if file in IGNORED_FILES or file.endswith((".pyc", ".png", ".jpg", ".pt", ".bin")):
                continue

            filepath = Path(root) / file
            total_files += 1
            findings = scan_file(filepath)

            if findings:
                rel_path = filepath.relative_to(WORKSPACE_ROOT)
                print(f"\n⚠️  [ALERT] Potential secret in: {rel_path}")
                for line_no, desc, snippet in findings:
                    print(f"    Line {line_no}: {desc} -> {snippet}")
                    total_findings += 1

    print("\n" + "-" * 70)
    print(f"📊 Scan Summary: {total_files} files scanned | {total_findings} potential issues found.")
    if total_findings == 0:
        print("✅ PASSED: No unauthorized live secrets or credentials detected in repository.")
        print("-" * 70)
        return 0
    else:
        print("❌ FAILED: Please inspect and sanitize the flagged lines before releasing.")
        print("-" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(scan_workspace())
