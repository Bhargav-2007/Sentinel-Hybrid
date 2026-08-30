export interface SizingSpec {
  scale_cameras: number;
  ai_stream_concurrency: number;
  gpu_vram_gb_required: number;
  cpu_cores_required: number;
  ram_gb_required: number;
  storage_tb_30days: number;
  network_bandwidth_mbps: number;
  hardware_nodes_recommended: number;
}

export interface TcoFinancialReport {
  camera_count: number;
  centralized_traditional_annual_inr_cr: number;
  sentinel_edge_ai_annual_inr_cr: number;
  annual_savings_inr_cr: number;
  savings_percentage: number;
  bandwidth_traditional_gbps: number;
  bandwidth_sentinel_mbps: number;
}

export interface LiveTelemetry {
  cpu: {
    usage_percent: number;
    cores_logical: number;
    status: string;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    usage_percent: number;
    status: string;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    usage_percent: number;
    status: string;
  };
}
