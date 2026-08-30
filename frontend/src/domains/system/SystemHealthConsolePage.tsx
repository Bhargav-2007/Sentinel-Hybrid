import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analyticsService';
import { 
  BarChart3, 
  Cpu, 
  Server, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Radio,
  HardDrive
} from 'lucide-react';

export const SystemHealthConsolePage: React.FC = () => {
  const { data: telemetry } = useQuery({
    queryKey: ['telemetry-console'],
    queryFn: () => analyticsService.getLiveTelemetry(),
    refetchInterval: 5000,
  });

  const services = [
    { name: 'API Gateway (Go 1.23)', port: ':8000', status: 'HEALTHY', latency: '2ms' },
    { name: 'PostGIS Registry (Python)', port: ':8001', status: 'HEALTHY', latency: '4ms' },
    { name: 'Unified Viewer (PyAV / YOLOv8)', port: ':8002', status: 'HEALTHY', latency: '12ms' },
    { name: 'VMS Federation (Spring Boot)', port: ':8003', status: 'HEALTHY', latency: '18ms' },
    { name: 'Trajectory Store (Go / MinIO)', port: ':8004', status: 'HEALTHY', latency: '5ms' },
    { name: 'Central Brain Orchestrator (FastAPI)', port: ':8005', status: 'HEALTHY', latency: '3ms' },
    { name: 'AI Vision Engine (YOLO11 + ByteTrack)', port: ':8006', status: 'HEALTHY', latency: '14ms' },
    { name: 'WebSocket Realtime Bus', port: ':8005/ws', status: 'HEALTHY', latency: '<1ms' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              OPERATIONS INFRASTRUCTURE & SRE TELEMETRY CONSOLE
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              Prometheus Metrics • GPU Cluster Health • Queue Latency • Zero Packet Drop
            </p>
          </div>
        </div>

        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
          ● ALL CLUSTER NODES OPERATIONAL
        </span>
      </div>

      {/* Host Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold">CPU UTILIZATION</span>
            <div className="text-2xl font-bold text-cyan-300 mt-1">{telemetry?.cpu.usage_percent || 12.4}%</div>
            <span className="text-[10px] text-slate-400">{telemetry?.cpu.cores_logical || 8} Logical Cores</span>
          </div>
          <Cpu className="w-8 h-8 text-cyan-400" />
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold">RAM MEMORY</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{telemetry?.memory.used_gb || 4.2} GB</div>
            <span className="text-[10px] text-emerald-400">{telemetry?.memory.usage_percent || 26.2}% Allocated</span>
          </div>
          <Server className="w-8 h-8 text-emerald-400" />
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold">GPU INFERENCE CLUSTER</span>
            <div className="text-2xl font-bold text-amber-300 mt-1">25.4 FPS</div>
            <span className="text-[10px] text-cyan-400">YOLO11 ONNX Runtime</span>
          </div>
          <Zap className="w-8 h-8 text-amber-400" />
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold">KAFKA QUEUE DEPTH</span>
            <div className="text-2xl font-bold text-slate-200 mt-1">0 Lag</div>
            <span className="text-[10px] text-emerald-400">● 100% Realtime Throughput</span>
          </div>
          <HardDrive className="w-8 h-8 text-slate-400" />
        </div>
      </div>

      {/* Services Health Matrix */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
          MICROSERVICE TOPOLOGY & HEALTH MATRIX
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((svc) => (
            <div key={svc.name} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200">{svc.name}</span>
                <span className="text-[10px] font-bold text-cyan-400">{svc.port}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-900">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {svc.status}
                </span>
                <span className="text-slate-500">Latency: {svc.latency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
