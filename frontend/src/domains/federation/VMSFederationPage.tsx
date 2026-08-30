import React from 'react';
import { Server, CheckCircle2, AlertTriangle, Radio, RefreshCw, Cpu } from 'lucide-react';

export const VMSFederationPage: React.FC = () => {
  const federatedSystems = [
    { name: 'Ahmedabad Police Smart City VMS', vendor: 'Milestone XProtect', cameras: 24, status: 'CONNECTED', latency: '24ms', adapter: 'REST_VMS_ADAPTER' },
    { name: 'Surat Municipal Control VMS', vendor: 'HikCentral Enterprise', cameras: 12, status: 'CONNECTED', latency: '31ms', adapter: 'ONVIF_PROFILE_S_G' },
    { name: 'Gandhinagar State HQ Direct Mesh', vendor: 'Corp8 Cloud Ingest', cameras: 14, status: 'CONNECTED', latency: '18ms', adapter: 'RTSP_TCP_NATIVE' },
  ];

  const connectors = [
    { name: 'ONVIF Profile S/T/G Adapter', version: 'v2.4.1', status: 'ACTIVE', cameras: 28 },
    { name: 'HikCentral ISAPI Rest Connector', version: 'v1.8.0', status: 'ACTIVE', cameras: 12 },
    { name: 'Milestone MIP SDK Bridge', version: 'v2024.R2', status: 'ACTIVE', cameras: 24 },
    { name: 'RTSP / WebRTC Stream Ingestion Gateway', version: 'v3.0.0', status: 'ACTIVE', cameras: 50 },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              MODEL 3 VMS FEDERATION & PROTOCOL CONNECTORS
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              Java Spring Boot Federation Layer (Port :8003) • Multi-VMS Aggregation
            </p>
          </div>
        </div>

        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
          ● 3/3 VMS CLUSTERS CONNECTED
        </span>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {federatedSystems.map((sys, idx) => (
          <div key={idx} className="bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">{sys.vendor}</span>
                <span className="text-emerald-400 font-bold text-[10px]">● {sys.status}</span>
              </div>
              <h3 className="font-bold text-slate-100 text-xs">{sys.name}</h3>
              <p className="text-[10px] text-slate-500 font-sans">Adapter: {sys.adapter}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-[10px]">
              <div>
                <span className="text-slate-500">MAPPED CAMS</span>
                <p className="font-bold text-cyan-300">{sys.cameras} Feeds</p>
              </div>
              <div>
                <span className="text-slate-500">LATENCY</span>
                <p className="font-bold text-emerald-400">{sys.latency}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connectors Table */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
          ACTIVE PROTOCOL ADAPTERS & BRIDGES
        </h3>
        <div className="space-y-2">
          {connectors.map((c, i) => (
            <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 text-xs">{c.name}</span>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Version: {c.version} • Live Streams: {c.cameras}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                ● {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
