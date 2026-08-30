import React from 'react';
import { Layers, MapPin, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CoverageGapPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-xl">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            STATEWIDE CCTV COVERAGE DENSITY & GAP ANALYSIS
          </h1>
          <p className="text-[11px] text-slate-400 font-sans">
            Model 1 Spatial Heuristics • Dead-Zone Identification • Strategic Intersection Planning
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">COVERED ROAD LENGTH</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">72.4%</div>
          <span className="text-[10px] text-slate-400">State Arteries & Highways</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">CRITICAL ZONES MONITORED</span>
          <div className="text-2xl font-bold text-cyan-300 mt-1">91.2%</div>
          <span className="text-[10px] text-emerald-400">● 142 Key Intersections</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">DETECTED DEAD-ZONES</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">47 Zones</div>
          <span className="text-[10px] text-amber-400">▲ Expansion Recommended</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">AGING HARDWARE</span>
          <div className="text-2xl font-bold text-slate-300 mt-1">12 Nodes</div>
          <span className="text-[10px] text-slate-400">H.264 Legacy Upgrades</span>
        </div>
      </div>

      {/* Dead Zones Table */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
          PRIORITY CORRIDOR GAP AUDIT LIST
        </h3>
        <div className="space-y-2">
          {[
            { zone: 'Mehsana–Unjha Bypass Stretch', distance: '14.2 km', priority: 'HIGH', recommendation: 'Install 4 ANPR + 2 PTZ Poles' },
            { zone: 'Surat Diamond Bourse Outer Ring', distance: '8.5 km', priority: 'CRITICAL', recommendation: 'Deploy 8 AI Fixed 4K Nodes' },
            { zone: 'Rajkot Industrial Perimeter Sector 4', distance: '6.1 km', priority: 'MEDIUM', recommendation: 'Expand VMS Mesh by 3 Cameras' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 text-xs">{item.zone}</span>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Length: {item.distance} • Rec: {item.recommendation}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/40">
                {item.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
