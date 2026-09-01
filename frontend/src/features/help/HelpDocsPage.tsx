import React from 'react';
import { HelpCircle, BookOpen, ShieldCheck, Terminal, PhoneCall } from 'lucide-react';

export const HelpDocsPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-4xl font-mono text-xs">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex items-center gap-3">
        <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">Gujarat Police Sentinel — Standard Operating Procedures</h1>
          <p className="text-xs text-slate-400">SOC Command Guide &bull; Section 65B Forensics &bull; Emergency Contacts</p>
        </div>
      </div>

      <div className="grid gap-4">
        {/* SOP 1: Target Pursuit & APB Interception */}
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyber-cyan font-bold text-sm">
            <BookOpen className="w-4 h-4" />
            <span>SOP-01: Live APB Pursuit & Hotlist Interception</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
            <li>When an APB alarm fires on the Topbar, click on the flashing alert banner to open the sighting location.</li>
            <li>Inspect OCR confidence score and eGujCop active FIR details in the side Context Panel.</li>
            <li>Click <b>Track in Investigation</b> to reconstruct the multi-camera flight trajectory across physical junctions.</li>
            <li>Notify field PCR vans located within the 5km defense bubble using coordinates plotted on the GIS map.</li>
          </ol>
        </div>

        {/* SOP 2: Judicial Evidence Export */}
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>SOP-02: Section 65B Evidence Export for Court Submissions</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Every snapshot captured by Sentinel carries a cryptographic HMAC-SHA256 digital certificate verifying camera ID, frame presentation timestamp (PTS), and capture time. Click <b>PRINT 65B CERTIFICATE</b> in the Case Files screen to generate the official certificate admissible under Bharatiya Sakshya Adhiniyam 2023.
          </p>
        </div>

        {/* Emergency State Police Contacts */}
        <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
            <PhoneCall className="w-4 h-4" />
            <span>Emergency State Police SOC Control Room Directory</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
            <div>
              <p className="text-slate-500">State Control Room (Gandhinagar):</p>
              <p className="font-bold text-cyber-cyan">079-23254000 / 112</p>
            </div>
            <div>
              <p className="text-slate-500">Ahmedabad City Police Cyber SOC:</p>
              <p className="font-bold text-cyber-cyan">079-25630100</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
