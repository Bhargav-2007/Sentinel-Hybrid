<#
.SYNOPSIS
    Gujarat Sentinel Platform — Universal Backend Launcher & Localhost Portal
.DESCRIPTION
    Starts all Docker infrastructure containers and microservices, waits for health checks,
    and displays a complete interactive index of all accessible localhost services and Swagger docs.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "🛡️  GUJARAT SENTINEL — UNIFIED SURVEILLANCE PLATFORM BACKEND LAUNCHER" -ForegroundColor Cyan
Write-Host "   Gujarat Police Innovation Challenge 2026 | Full Stack SRE Environment" -ForegroundColor DarkGray
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Docker Containers
Write-Host "[1/3] Starting Docker Compose Services..." -ForegroundColor Yellow
docker compose up -d postgres redis minio kafka zookeeper opensearch prometheus grafana kafka-ui model1 model2 model3 model4 gateway orchestrator

# 2. Wait for services to stabilize
Write-Host "[2/3] Waiting for microservices to reach HEALTHY status..." -ForegroundColor Yellow
$services = @(
    @{ Name = "Hybrid Gateway (Go)"; Port = 8000; Url = "http://localhost:8000/health" },
    @{ Name = "Model 1 - Registry & GIS (Python)"; Port = 8001; Url = "http://localhost:8001/health" },
    @{ Name = "Model 2 - Viewer & ANPR (Python)"; Port = 8002; Url = "http://localhost:8002/health" },
    @{ Name = "Model 3 - VMS Federation (Java)"; Port = 8003; Url = "http://localhost:8003/actuator/health" },
    @{ Name = "Model 4 - Trajectory Store (Go)"; Port = 8004; Url = "http://localhost:8004/health" },
    @{ Name = "Central Brain Orchestrator (Python)"; Port = 8005; Url = "http://localhost:8005/health" }
)

Start-Sleep -Seconds 3

Write-Host "`n[3/3] Auditing Localhost Services Availability:" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor Gray

foreach ($svc in $services) {
    try {
        $response = Invoke-WebRequest -Uri $svc.Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host ("  [ONLINE]  {0,-36} -> http://localhost:{1}" -f $svc.Name, $svc.Port) -ForegroundColor Green
        } else {
            Write-Host ("  [WARN]    {0,-36} -> http://localhost:{1} (HTTP {2})" -f $svc.Name, $svc.Port, $response.StatusCode) -ForegroundColor Yellow
        }
    } catch {
        Write-Host ("  [OFFLINE] {0,-36} -> http://localhost:{1}" -f $svc.Name, $svc.Port) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "🌐 ALL LOCALHOST ACCESS URLS & DASHBOARDS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "👑 PRIMARY CONTROL ROOM & ORCHESTRATOR:" -ForegroundColor White
Write-Host "  • Police Video Wall UI:       http://localhost:3000  (or Vite: http://localhost:3001)" -ForegroundColor Green
Write-Host "  • Central Brain REST API:     http://localhost:8005" -ForegroundColor Green
Write-Host "  • Central Brain Swagger Docs: http://localhost:8005/docs" -ForegroundColor Yellow
Write-Host "  • Live API Gateway:           http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "🤖 AI & VISION MICROSERVICES:" -ForegroundColor White
Write-Host "  • Model 1 Registry & GIS API: http://localhost:8001/docs" -ForegroundColor Green
Write-Host "  • Model 2 Unified Viewer API: http://localhost:8002/docs" -ForegroundColor Green
Write-Host "  • Model 3 VMS Federation:     http://localhost:8003/actuator/health" -ForegroundColor Green
Write-Host "  • Model 4 Trajectory API:     http://localhost:8004/api/v1/tracking/vehicles" -ForegroundColor Green
Write-Host "  • AI Vision & ANPR Engine:    http://localhost:8006/docs" -ForegroundColor Green
Write-Host ""
Write-Host "📊 OBSERVABILITY & MANAGEMENT CONSOLES:" -ForegroundColor White
Write-Host "  • Grafana SRE Dashboards:     http://localhost:3000  (Credentials: admin / admin)" -ForegroundColor Green
Write-Host "  • Kafka Cluster Web UI:       http://localhost:8082" -ForegroundColor Green
Write-Host "  • MinIO S3 Console:           http://localhost:9005  (Credentials: minioadmin / minioadmin)" -ForegroundColor Green
Write-Host "  • OpenSearch Dashboards:      http://localhost:5601" -ForegroundColor Green
Write-Host "  • Prometheus Server:          http://localhost:9090" -ForegroundColor Green
Write-Host "  • RTSP Stream WebRTC (WHEP):  http://localhost:8889" -ForegroundColor Green
Write-Host ""
Write-Host "👮 DEMO CREDENTIALS (OFFICER BADGE NUMBER):" -ForegroundColor White
Write-Host "  • Officer ID:  POLICE-AHM-042" -ForegroundColor Cyan
Write-Host "  • Password:    Sentinel@2026" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press [Enter] to open the Central Brain Swagger Docs in your browser, or close this window."
$null = Read-Host
Start-Process "http://localhost:8005/docs"
