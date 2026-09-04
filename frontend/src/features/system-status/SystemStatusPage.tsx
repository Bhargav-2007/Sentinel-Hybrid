import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Server, Cpu, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { systemApi } from '../../core/api/systemApi';
import { MicroserviceHealth } from '../../core/types/system';

export const SystemStatusPage: React.FC = () => {
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['system-status'],
    queryFn: systemApi.getSystemStatus,
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-white">
              System Health Aggregation & Backend Service Diagnostics
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Live Health Auditing &bull; Distributed Microservice Latencies &bull; Ingestion Pipeline Throughput
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan font-mono text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>PING ALL SERVICES</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Orchestrator Gateway</span>
          <p className="text-lg font-bold text-emerald-400">
            {status?.services.filter((s) => s.status === 'ONLINE').length || 0} / {status?.services.length || 0} ACTIVE
          </p>
          <span className="text-[10px] text-slate-400">Port :8000</span>
        </div>
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Registered Cameras</span>
          <p className="text-lg font-bold text-cyber-cyan">{status?.total_cameras || 0} Nodes</p>
          <span className="text-[10px] text-slate-400">Gujarat CCTV Registry</span>
        </div>
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Avg Service Latency</span>
          <p className="text-lg font-bold text-yellow-400">
            {status?.services && status.services.length > 0
              ? `${(status.services.reduce((acc, s) => acc + s.latency_ms, 0) / status.services.length).toFixed(1)} ms`
              : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-400">Backend Response Time</span>
        </div>
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Pipeline Architecture</span>
          <p className="text-lg font-bold text-cyber-emerald">Edge + Cloud</p>
          <span className="text-[10px] text-slate-400">Hybrid Metadata Ingestion</span>
        </div>
      </div>

      {/* Services Table */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center font-mono text-xs text-cyber-cyan">
          Auditing Distributed Microservices...
        </div>
      ) : (
        <div className="rounded border border-slate-800 bg-sentinel-900 overflow-hidden font-mono text-xs">
          <div className="p-3 bg-slate-950 border-b border-slate-800 font-bold text-slate-300 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyber-cyan" />
            <span>Microservice Topology & Health Registry</span>
          </div>

          <div className="divide-y divide-slate-800">
            {status?.services.map((svc: MicroserviceHealth) => (
              <div
                key={svc.port}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{svc.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Port :{svc.port}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{svc.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-cyber-cyan font-bold">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{svc.latency_ms} ms</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{svc.endpoint}</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{svc.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
