import React from 'react';
import { ShieldCheck, Users, FileCheck, Lock, CheckCircle2 } from 'lucide-react';

export const AdminSecurityAuditPage: React.FC = () => {
  const officers = [
    { id: 'ADMIN-GND-001', badge: 'GJ-POL-0001', name: 'Director General of Police', role: 'ADMIN', station: 'Gandhinagar Police HQ', status: 'ACTIVE' },
    { id: 'POLICE-AHM-042', badge: 'GJ-POL-8842', name: 'Inspector R.K. Jadeja', role: 'DUTY_OFFICER', station: 'Navrangpura PS, Ahmedabad', status: 'ACTIVE' },
    { id: 'DISPATCH-SRT-019', badge: 'GJ-POL-4119', name: 'Sub-Inspector M.P. Patel', role: 'DISPATCHER', station: 'Surat Central Police Control', status: 'ACTIVE' },
    { id: 'INVEST-VAD-088', badge: 'GJ-POL-9988', name: 'Inspector K.L. Solanki', role: 'INVESTIGATOR', station: 'Vadodara Crime Branch', status: 'ACTIVE' },
  ];

  const auditEvents = [
    { time: '15:42:32', user: 'POLICE-AHM-042', action: 'VIEW_CAMERA', resource: 'CAM-042 (SG Highway)', hmac: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9' },
    { time: '15:42:41', user: 'POLICE-AHM-042', action: 'TRACE_VEHICLE', resource: 'GJ01AB1234', hmac: 'a48e71b281f9a1c84d72e90c61b2a94f1c7d2e8b' },
    { time: '15:43:01', user: 'ADMIN-GND-001', action: 'EXPORT_VIDEO', resource: 'CASE-FIR-881', hmac: '91f8c2e17a4b8d9c2e1f7a8b9c4d2e1f8a7b9c4d' },
    { time: '15:43:19', user: 'DISPATCH-SRT-019', action: 'DISPATCH_PURSUIT', resource: 'PCR-Eagle-07', hmac: 'd8a2c4e1f7b9c4d2e1f8a7b9c4d2e1f8a7b9c4d2' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              CYBERSECURITY, RBAC CLEARANCES & FORENSIC AUDIT LOG
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              Role-Based Access Control • Section 65B Cryptographic Audit Trail • Break-Glass Logs
            </p>
          </div>
        </div>

        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
          ● AUDIT INTEGRITY SEALED (SHA-256)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Officer RBAC Directory (6 cols) */}
        <div className="lg:col-span-6 bg-[#090e1a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-100 uppercase">OFFICER ACCESS ROLES</h2>
            </div>
            <span className="text-[10px] text-slate-400">4 ACTIVE</span>
          </div>

          <div className="space-y-2">
            {officers.map((off) => (
              <div key={off.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-xs">{off.id}</span>
                    <span className="text-[10px] bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-1.5 py-0.2 rounded">
                      {off.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">{off.name} • {off.station}</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
                  {off.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Forensic Action Log (6 cols) */}
        <div className="lg:col-span-6 bg-[#090e1a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-100 uppercase">IMMUTABLE FORENSIC AUDIT LOG</h2>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">HMAC CHAINED</span>
          </div>

          <div className="space-y-2">
            {auditEvents.map((evt, idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-cyan-300">{evt.action}</span>
                  <span className="text-[10px] text-slate-500">{evt.time} IST</span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Officer: <strong className="text-slate-100">{evt.user}</strong> | Target: <strong className="text-yellow-300">{evt.resource}</strong>
                </p>
                <p className="text-[9px] text-slate-500 truncate font-mono bg-slate-900 px-2 py-0.5 rounded">
                  HMAC: {evt.hmac}...
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
