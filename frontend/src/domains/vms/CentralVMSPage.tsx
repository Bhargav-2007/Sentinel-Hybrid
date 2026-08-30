import React from 'react';
import { Database, HardDrive, Zap, Server, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const CentralVMSPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              MODEL 4 CENTRAL VMS RECORDING, RETENTION & TIERED STORAGE
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              MinIO S3 / Kafka Distributed Store • 30-Day Legal Retention • 99.97% Edge Bandwidth Reduction
            </p>
          </div>
        </div>

        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
          ● MINIO S3 OBJECT STORE HEALTHY
        </span>
      </div>

      {/* Tiered Storage Architecture Cards: HOT, WARM, COLD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HOT TIER */}
        <div className="bg-[#090e1a] border border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold uppercase text-[10px]">HOT STORAGE TIER</span>
              <span className="text-[10px] text-slate-500">NVMe SSD CLUSTER</span>
            </div>
            <div className="text-3xl font-bold text-slate-100 mt-2">2.1 PB</div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Active 72-hour rolling buffer for immediate tactical replay & high-frame ANPR clips.
            </p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-[10px] text-cyan-300 font-bold">
            Retention: 3 Days Instant Seek
          </div>
        </div>

        {/* WARM TIER */}
        <div className="bg-[#090e1a] border border-amber-500/40 p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-bold uppercase text-[10px]">WARM STORAGE TIER</span>
              <span className="text-[10px] text-slate-500">HYBRID SAS SAN</span>
            </div>
            <div className="text-3xl font-bold text-slate-100 mt-2">8.4 PB</div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              30-day statutory police custody retention with Section 65B HMAC hash verification.
            </p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-[10px] text-amber-300 font-bold">
            Retention: 30 Days Statutory Police
          </div>
        </div>

        {/* COLD TIER */}
        <div className="bg-[#090e1a] border border-purple-500/40 p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 font-bold uppercase text-[10px]">COLD ARCHIVE TIER</span>
              <span className="text-[10px] text-slate-500">GLACIER / TAPE</span>
            </div>
            <div className="text-3xl font-bold text-slate-100 mt-2">22.8 PB</div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Long-term evidentiary archive for FIR case trials & judicial evidence retention.
            </p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-[10px] text-purple-300 font-bold">
            Retention: 3 Years Judicial Cases
          </div>
        </div>
      </div>

      {/* Ingestion & Retention Policies */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
          DEPARTMENT RETENTION & BANDWIDTH SAVINGS SPECIFICATION
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">GUJARAT POLICE</span>
            <p className="font-bold text-slate-200 mt-1">30 Days Full Retention</p>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">High-definition on-demand clip extraction</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">TRANSPORT & RTO</span>
            <p className="font-bold text-slate-200 mt-1">15 Days ANPR Metadata</p>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">E-challan proof snapshots & JSON timestamps</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">MUNICIPAL & AMC</span>
            <p className="font-bold text-slate-200 mt-1">7 Days Rolling Buffer</p>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">Traffic flow density heatmaps</p>
          </div>
        </div>
      </div>
    </div>
  );
};
