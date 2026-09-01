export interface MicroserviceHealth {
  name: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  latency_ms: number;
  version?: string;
  description: string;
  endpoint: string;
}

export interface SystemStatusSummary {
  gateway_status: 'healthy' | 'degraded';
  uptime_seconds: number;
  total_cameras: number;
  active_streams: number;
  detections_last_minute: number;
  active_alerts: number;
  services: MicroserviceHealth[];
}
