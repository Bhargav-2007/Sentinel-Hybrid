# =============================================================================
# Gujarat Sentinel - Cross-Platform Full-Stack Runner (Windows PowerShell Wrapper)
# Forwards execution to canonical Python runner scripts/run.py
# Pure 7-bit ASCII encoding for 100% compatibility with Windows PowerShell 5.1+
# =============================================================================

$ErrorActionPreference = "Stop"

# Set working directory to project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Locate Python 3 interpreter
$PythonBin = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $PythonBin = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $PythonBin = "py"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PythonBin = "python3"
} else {
    Write-Host "[!] Error: Python 3 is required to run Gujarat Sentinel. Please install Python." -ForegroundColor Red
    exit 1
}

# Helper function to execute run.py actions
function Execute-SentinelAction([string]$Selection) {
    switch ($Selection) {
        "1" { & $PythonBin scripts/run.py --core-start }
        "2" { & $PythonBin scripts/run.py --start }
        "3" { & $PythonBin scripts/run.py --clean-ports }
        "4" { & $PythonBin scripts/run.py --doctor }
        "5" { & $PythonBin scripts/run.py --verify }
        "6" { & $PythonBin scripts/run.py --stop-apps }
        "7" { & $PythonBin scripts/run.py --stop-all }
        "core" { & $PythonBin scripts/run.py --core-start }
        "doctor" { & $PythonBin scripts/run.py --doctor }
        "clean" { & $PythonBin scripts/run.py --clean-ports }
        "verify" { & $PythonBin scripts/run.py --verify }
        "stop" { & $PythonBin scripts/run.py --stop-apps }
        "0" { Write-Host "Exiting."; exit 0 }
        default {
            # Direct flag forwarding (e.g. --core-start, --doctor, etc.)
            & $PythonBin scripts/run.py @args
        }
    }
}

# If arguments provided on command line, handle mapping or direct forward
if ($args.Count -gt 0) {
    $firstArg = [string]$args[0]
    if ($args.Count -eq 1 -and ($firstArg -match "^[0-7]$" -or $firstArg -in @("core", "doctor", "clean", "verify", "stop"))) {
        Execute-SentinelAction $firstArg
    } else {
        & $PythonBin scripts/run.py @args
    }
    exit $LASTEXITCODE
}

# Interactive Windows Control Menu
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  GUJARAT SENTINEL -- WINDOWS CONTROL CENTER" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  [1] Start All Models and Officer Suite (M1, M2, M3, M4, AI, Brain, UI)" -ForegroundColor Green
Write-Host "  [2] Start Full Stack (All Models and Docker Infra)" -ForegroundColor White
Write-Host "  [3] Clean and Free Occupied Ports (8000-8006, 3001, Docker)" -ForegroundColor Yellow
Write-Host "  [4] Run Diagnostics (Doctor)" -ForegroundColor Cyan
Write-Host "  [5] Run End-to-End Smoke Verification" -ForegroundColor White
Write-Host "  [6] Stop Application Services" -ForegroundColor Yellow
Write-Host "  [7] Stop All (Apps and Docker Containers)" -ForegroundColor Red
Write-Host "  [0] Exit" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

$choice = Read-Host ">> Enter selection [0-7, Default: 1]"
if (-not $choice) { $choice = "1" }

Execute-SentinelAction $choice
exit $LASTEXITCODE
