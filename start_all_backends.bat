@echo off
title Gujarat Sentinel — Platform Launcher
chcp 65001 >nul
cls

echo ================================================================================
echo  GUJARAT SENTINEL — UNIFIED SURVEILLANCE PLATFORM LAUNCHER
echo  Gujarat Police Innovation Challenge 2026
echo ================================================================================
echo.

echo [1/2] Starting all Docker infrastructure and microservice backends...
docker compose up -d postgres redis minio kafka zookeeper opensearch prometheus grafana kafka-ui model1 model2 model3 model4 gateway orchestrator

echo.
echo [2/2] Launching Universal Localhost Portal...
echo.
python scripts\launch_platform.py

pause
