#!/usr/bin/env bash
# =============================================================================
# Gujarat Sentinel — Cross-Platform Full-Stack Runner (Linux / Kali Wrapper)
# Forwards execution to canonical Python runner scripts/run.py
# =============================================================================

set -e

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Locate Python 3 interpreter
if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
else
    echo "[!] Error: Python 3 is required to run Gujarat Sentinel. Please install python3."
    exit 1
fi

# Forward all arguments to canonical runner
exec "$PYTHON_BIN" scripts/run.py "$@"
