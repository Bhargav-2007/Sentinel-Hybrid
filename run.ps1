# =============================================================================
# Gujarat Sentinel — Cross-Platform Full-Stack Runner (Windows PowerShell Wrapper)
# Forwards execution to canonical Python runner scripts/run.py
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

# If arguments provided, forward directly to canonical runner
if ($args.Count -gt 0) {
    & $PythonBin scripts/run.py @args
    exit $LASTEXITCODE
}

# Interactive Windows Control Menu
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  GUJARAT SENTINEL — WINDOWS CONTROL CENTER" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  [1] Start Core Officer Path (Recommended: M1, M2, AI, Brain, UI)" -ForegroundColor Green
Write-Host "  [2] Start Full Stack (All Models & Docker Infra)" -ForegroundColor White
Write-Host "  [3] Clean & Free Occupied Ports (8000-8006, 3001, Docker)" -ForegroundColor Yellow
Write-Host "  [4] Run Diagnostics (Doctor)" -ForegroundColor Cyan
Write-Host "  [5] Run End-to-End Smoke Verification" -ForegroundColor White
Write-Host "  [6] Stop Application Services" -ForegroundColor Yellow
Write-Host "  [7] Stop All (Apps + Docker Containers)" -ForegroundColor Red
Write-Host "  [0] Exit" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

$choice = Read-Host "👉 Enter selection [0-7, Default: 1]"
if (-not $choice) { $choice = "1" }

switch ($choice) {
    "1" { & $PythonBin scripts/run.py --core-start }
    "2" { & $PythonBin scripts/run.py --start }
    "3" { & $PythonBin scripts/run.py --clean-ports }
    "4" { & $PythonBin scripts/run.py --doctor }
    "5" { & $PythonBin scripts/run.py --verify }
    "6" { & $PythonBin scripts/run.py --stop-apps }
    "7" { & $PythonBin scripts/run.py --stop-all }
    "0" { Write-Host "Exiting."; exit 0 }
    default { & $PythonBin scripts/run.py @args }
}
exit $LASTEXITCODE
