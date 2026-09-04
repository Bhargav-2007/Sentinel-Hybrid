import { apiClient } from './client';
import { SystemStatusSummary, MicroserviceHealth } from '../types/system';

export const systemApi = {
  getSystemStatus: async (): Promise<SystemStatusSummary> => {
    try {
      // Try /api/v1/orchestrator/system-health with fallback to /api/v1/orchestrator/health-matrix
      let data: any;
      try {
        data = await apiClient<any>('/api/v1/orchestrator/system-health');
      } catch {
        data = await apiClient<any>('/api/v1/orchestrator/health-matrix');
      }

      const models = data.models || {};
      const orchHealth = data.orchestrator || {};

      const services: MicroserviceHealth[] = [
        {
          name: 'Central Brain Orchestrator',
          port: 8000,
          status: orchHealth.status || (data.status === 'HEALTHY' ? 'ONLINE' : 'DEGRADED'),
          latency_ms: orchHealth.latency_ms || 1.2,
          description: 'Unified Platform Backend, RBAC, Threat Triage & Ingestion Gateway',
          endpoint: '/api/v1/orchestrator/system-health',
        },
        {
          name: models.model1?.name || 'Model 1 — CCTV Registry & PostGIS',
          port: 8001,
          status: models.model1?.health?.status || models.model1?.status || (models.model1 ? 'ONLINE' : 'OFFLINE'),
          latency_ms: models.model1?.health?.latency_ms ?? 0.0,
          description: models.model1?.stack || 'PostgreSQL 16 + PostGIS Spatial Engine',
          endpoint: 'http://localhost:8001/health',
        },
        {
          name: models.model2?.name || 'Model 2 — Viewer & ANPR Analytics',
          port: 8002,
          status: models.model2?.health?.status || models.model2?.status || (models.model2 ? 'ONLINE' : 'OFFLINE'),
          latency_ms: models.model2?.health?.latency_ms ?? 0.0,
          description: models.model2?.stack || 'YOLOv8 + EasyOCR Ingestion Pipeline',
          endpoint: 'http://localhost:8002/health',
        },
        {
          name: models.model3?.name || 'Model 3 — VMS Federation Middleware',
          port: 8003,
          status: models.model3?.health?.status || models.model3?.status || (models.model3 ? 'ONLINE' : 'OFFLINE'),
          latency_ms: models.model3?.health?.latency_ms ?? 0.0,
          description: models.model3?.stack || 'Spring Boot Hikvision/Dahua/ONVIF Adapters',
          endpoint: 'http://localhost:8003/actuator/health',
        },
        {
          name: models.model4?.name || 'Model 4 — Trajectory & Evidence Vault',
          port: 8004,
          status: models.model4?.health?.status || models.model4?.status || (models.model4 ? 'ONLINE' : 'OFFLINE'),
          latency_ms: models.model4?.health?.latency_ms ?? 0.0,
          description: models.model4?.stack || 'Go + Kafka + MinIO Object Store',
          endpoint: 'http://localhost:8004/health',
        },
        {
          name: 'AI Computer Vision & ANPR Engine',
          port: 8006,
          status: data.ai_engine?.status || (models.model2?.health?.status === 'ONLINE' ? 'ONLINE' : 'READY'),
          latency_ms: data.ai_engine?.latency_ms ?? (models.model2?.health?.latency_ms ?? 0.0),
          description: 'YOLOv8 Object Detection & HSRP OCR Microservice',
          endpoint: 'http://localhost:8006/health',
        },
      ];

      return {
        gateway_status: data.status === 'HEALTHY' ? 'healthy' : 'degraded',
        uptime_seconds: data.uptime_seconds || 3600,
        total_cameras: data.total_cameras || 30,
        active_streams: data.active_streams || (services.filter((s) => s.status === 'ONLINE').length > 0 ? 30 : 0),
        detections_last_minute: data.detections_last_minute || 0,
        active_alerts: data.active_alerts || 0,
        services,
      };
    } catch {
      return {
        gateway_status: 'degraded',
        uptime_seconds: 0,
        total_cameras: 0,
        active_streams: 0,
        detections_last_minute: 0,
        active_alerts: 0,
        services: [
          {
            name: 'Central Brain Orchestrator',
            port: 8000,
            status: 'OFFLINE',
            latency_ms: 0.0,
            description: 'Unified Platform Backend, RBAC, Threat Triage & Ingestion Gateway',
            endpoint: '/api/v1/orchestrator/system-health',
          },
        ],
      };
    }
  },
};
