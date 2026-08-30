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

# Forward all arguments to canonical runner
& $PythonBin scripts/run.py @args
exit $LASTEXITCODE
