import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analyticsService';
import { 
  BarChart3, 
  Cpu, 
  Zap, 
  Server
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [cameraScale, setCameraScale] = useState<number>(80000);
  const [viewMode, setViewMode] = useState<'analytics' | 'grafana'>('analytics');

  // Fetch Sizing Matrix
  const { data: sizing } = useQuery({
    queryKey: ['sizing-matrix'],
    queryFn: () => analyticsService.getSizingMatrix(),
  });

  // Fetch TCO Report
  const { data: tco } = useQuery({
    queryKey: ['tco-report', cameraScale],
    queryFn: () => analyticsService.getTcoReport(cameraScale),
  });

  // Fetch Live Telemetry
  const { data: telemetry } = useQuery({
    queryKey: ['live-telemetry'],
    queryFn: () => analyticsService.getLiveTelemetry(),
    refetchInterval: 5000,
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Top Header & View Mode Switcher */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              INFRASTRUCTURE SIZING, TCO & SRE OBSERVABILITY
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              80,000 Camera Scale Projection • 99.97% Bandwidth Reduction Model • Live Prometheus Metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'analytics'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            SIZING & TCO
          </button>
          <button
            onClick={() => setViewMode('grafana')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'grafana'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            GRAFANA DASHBOARDS (PORT :3000)
          </button>
        </div>
      </div>

      {viewMode === 'grafana' ? (
        <div className="h-[calc(100vh-14rem)] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          <iframe
            src="http://localhost:3000/d/sentinel-overview/gujarat-sentinel-command-soc-overview?kiosk=tv"
            title="Grafana SOC Dashboards"
            className="w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Live Host Telemetry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-bold">HOST CPU UTILIZATION</span>
                <div className="text-xl font-bold text-cyan-300 mt-1">
                  {telemetry?.cpu ? `${telemetry.cpu.usage_percent}%` : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500">
                  {telemetry?.cpu ? `${telemetry.cpu.cores_logical} Logical Cores • ${telemetry.cpu.status}` : 'Awaiting host metrics'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-bold">MEMORY ALLOCATION</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {telemetry?.memory ? `${telemetry.memory.used_gb} GB / ${telemetry.memory.total_gb} GB` : 'N/A'}
                </div>
                <span className="text-[10px] text-emerald-400/80">
                  {telemetry?.memory ? `${telemetry.memory.usage_percent}% Utilization` : 'Awaiting memory metrics'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Server className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-bold">BANDWIDTH REDUCTION</span>
                <div className="text-xl font-bold text-amber-400 mt-1">99.97% SAVED</div>
                <span className="text-[10px] text-amber-400/80">Decentralized Edge Metadata</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Interactive Scale Slider */}
          <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold">SIMULATED DEPLOYMENT SCALE</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                  {cameraScale.toLocaleString()} State CCTV Nodes
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {[50, 2500, 20000, 80000].map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setCameraScale(sc)}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      cameraScale === sc
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {sc >= 1000 ? `${sc / 1000}k` : sc}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min={50}
              max={80000}
              step={500}
              value={cameraScale}
              onChange={(e) => setCameraScale(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* TCO Financial Comparison Matrix */}
          {tco && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-5 rounded-2xl border border-red-500/30 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-red-400 text-xs font-bold uppercase">Traditional Centralized Streaming</span>
                  <div className="text-3xl font-bold text-slate-100 mt-2">
                    ₹{tco.centralized_traditional_annual_inr_cr} Cr <span className="text-xs text-slate-500">/ Year</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-2">
                    Requires 320 Gbps dedicated fiber backhaul streaming continuous 1080p video centrally.
                  </p>
                </div>
                <div className="bg-red-950/40 p-3 rounded-xl text-red-300 text-xs font-bold">
                  Bandwidth Demand: {cameraScale >= 80000 ? '320 Gbps' : `${Math.round(cameraScale * 4)} Mbps`}
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 flex flex-col justify-between gap-4 shadow-lg shadow-emerald-500/5">
                <div>
                  <span className="text-emerald-400 text-xs font-bold uppercase">Gujarat Sentinel Edge AI Architecture</span>
                  <div className="text-3xl font-bold text-emerald-300 mt-2">
                    ₹{tco.sentinel_edge_ai_annual_inr_cr} Cr <span className="text-xs text-slate-500">/ Year</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-2">
                    Only transmits 1.2 KB JSON detection metadata & on-demand clips. Saves ₹{tco.annual_savings_inr_cr} Cr annually.
                  </p>
                </div>
                <div className="bg-emerald-950/50 p-3 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <span>Bandwidth Demand: 96 Mbps</span>
                  <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px]">
                    {tco.savings_percentage}% SAVINGS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
