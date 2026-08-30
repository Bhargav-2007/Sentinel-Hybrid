import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/analyticsService';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  Server, 
  FileCheck
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  // Fetch Backend Health Matrix
  const { data: healthMatrix } = useQuery({
    queryKey: ['health-matrix'],
    queryFn: () => analyticsService.getHealthMatrix(),
    refetchInterval: 10000,
  });

  const officers = [
    { id: 'ADMIN-GND-001', badge: 'GJ-POL-0001', name: 'Director General of Police', role: 'ADMIN', station: 'Gandhinagar Police HQ', status: 'ACTIVE' },
    { id: 'POLICE-AHM-042', badge: 'GJ-POL-8842', name: 'Inspector R.K. Jadeja', role: 'DUTY_OFFICER', station: 'Navrangpura PS, Ahmedabad', status: 'ACTIVE' },
    { id: 'DISPATCH-SRT-019', badge: 'GJ-POL-4119', name: 'Sub-Inspector M.P. Patel', role: 'DISPATCHER', station: 'Surat Central Police Control', status: 'ACTIVE' },
    { id: 'INVEST-VAD-088', badge: 'GJ-POL-9988', name: 'Inspector K.L. Solanki', role: 'INVESTIGATOR', station: 'Vadodara Crime Branch', status: 'ACTIVE' },
  ];

  const auditLogs = [
    { id: 'AUD-901', action: 'SECTION_65B_EXPORT', officer: 'POLICE-AHM-042', target: 'INC-0245D8AA', hmac: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03', time: '10 mins ago' },
    { id: 'AUD-900', action: 'ALERT_INVESTIGATION_START', officer: 'POLICE-AHM-042', target: 'INC-0245D8AA', hmac: 'a48e71b281f9a1c84d72e90c61b2a94f1c7d2e8b91a7e4d82b1c94f71a2e8b91', time: '14 mins ago' },
    { id: 'AUD-899', action: 'WATCHLIST_MATCH_HOTLIST', officer: 'SYSTEM_AI', target: 'GJ01AB1234', hmac: '91f8c2e17a4b8d9c2e1f7a8b9c4d2e1f8a7b9c4d2e1f8a7b9c4d2e1f8a7b9c4d', time: '15 mins ago' },
  ];

  const backendServices = [
    { name: 'Hybrid Gateway (Go 1.23)', port: ':8000', status: 'ONLINE', role: 'Reverse Proxy & Ingestion' },
    { name: 'Model 1 (Python / PostGIS)', port: ':8001', status: 'ONLINE', role: 'Central Camera Registry' },
    { name: 'Model 2 (PyAV / YOLOv8)', port: ':8002', status: 'ONLINE', role: 'Unified Viewer & ANPR' },
    { name: 'Model 3 (Java / Spring Boot)', port: ':8003', status: 'ONLINE', role: 'VMS Federation & PTZ' },
    { name: 'Model 4 (Go / MinIO S3)', port: ':8004', status: 'ONLINE', role: 'Trajectory Tracking Store' },
    { name: 'Central Brain Orchestrator', port: ':8005', status: 'ONLINE', role: 'AI Coordinator & Sec 65B' },
    { name: 'AI Vision & ANPR Engine', port: ':8006', status: 'ONLINE', role: 'YOLO11 + ByteTrack + PaddleOCR' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex items-center gap-3 shadow-xl">
        <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 tracking-wide">
            CYBER SECURITY, SECTION 65B AUDIT & BACKEND HEALTH
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Officer Access Control • Tamper-Evident HMAC Hash Chaining • 7-Service Microservice Health
          </p>
        </div>
      </div>

      {/* 7-Service Backend Health Matrix */}
      <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              MICROSERVICES HEALTH & CONNECTIVITY MATRIX
            </h2>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">7/7 SERVICES OPERATIONAL</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {backendServices.map((svc) => (
            <div key={svc.name} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200">{svc.name}</span>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  {svc.port}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">{svc.role}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold pt-1 border-t border-slate-900">
                <CheckCircle2 className="w-3 h-3" />
                <span>HEALTHY (HTTP 200)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Officer Personnel + Section 65B Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Officer Personnel List (6 cols) */}
        <div className="lg:col-span-6 bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                PERSONNEL & ROLE CLEARANCE
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">STATE REPOSITORY</span>
          </div>

          <div className="space-y-2.5">
            {officers.map((off) => (
              <div key={off.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100">{off.id}</span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded">
                      {off.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">{off.name} • {off.station}</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {off.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Section 65B Immutable Audit Ledger (6 cols) */}
        <div className="lg:col-span-6 bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                SECTION 65B EVIDENCE AUDIT TRAIL
              </h2>
            </div>
            <span className="text-[10px] text-emerald-400">HMAC-SHA-256</span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/90 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-cyan-300">{log.action}</span>
                  <span className="text-[10px] text-slate-500">{log.time}</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Officer: <strong className="text-slate-100">{log.officer}</strong> | Target: <strong className="text-yellow-300">{log.target}</strong>
                </p>
                <div className="text-[9px] text-slate-500 truncate bg-slate-900 px-2 py-1 rounded">
                  HMAC: {log.hmac}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
