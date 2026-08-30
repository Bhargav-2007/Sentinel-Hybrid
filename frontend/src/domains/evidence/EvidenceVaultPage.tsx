import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { 
  FileCheck, 
  Download, 
  Printer, 
  ShieldCheck, 
  Video, 
  Image as ImageIcon, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export const EvidenceVaultPage: React.FC = () => {
  const { openSection65BModal } = useUIStore();

  const evidenceItems = [
    {
      id: 'EVD-98101',
      title: 'ANPR Video Clip (SG Highway Checkpoint)',
      source: 'CAM-042 (Police 1080p Stream)',
      time: '15:42:28 IST',
      type: 'VIDEO',
      hash: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03',
      caseNumber: 'FIR-2026-CR-0881',
      custody: 'OFFICER_LOCKED',
    },
    {
      id: 'EVD-98102',
      title: 'HSRP Plate Recognition Frame & OCR Crop',
      source: 'CAM-042 (PaddleOCR Crop)',
      time: '15:42:28 IST',
      type: 'SNAPSHOT',
      hash: 'a48e71b281f9a1c84d72e90c61b2a94f1c7d2e8b91a7e4d82b1c94f71a2e8b91',
      caseNumber: 'FIR-2026-CR-0881',
      custody: 'OFFICER_LOCKED',
    },
    {
      id: 'EVD-98103',
      title: 'Multi-Camera Trajectory Sequence PDF',
      source: 'Central Brain Orchestrator',
      time: '15:45:00 IST',
      type: 'REPORT',
      hash: '91f8c2e17a4b8d9c2e1f7a8b9c4d2e1f8a7b9c4d2e1f8a7b9c4d2e1f8a7b9c4d',
      caseNumber: 'FIR-2026-CR-0881',
      custody: 'OFFICER_LOCKED',
    },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              SECTION 65B FORENSIC DIGITAL EVIDENCE VAULT
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              Indian Evidence Act Statutory Compliance • SHA-256 HMAC Immutable Hash Chaining
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg font-bold text-[11px]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>CHAIN OF CUSTODY VERIFIED</span>
        </div>
      </div>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {evidenceItems.map((item) => (
          <div
            key={item.id}
            className="bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xl hover:border-slate-700 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                  {item.type}
                </span>
                <span className="text-slate-400 text-[10px]">{item.id}</span>
              </div>
              <h3 className="font-bold text-slate-100 text-xs">{item.title}</h3>
              <p className="text-[10px] text-slate-400 font-sans">{item.source}</p>
              <p className="text-[10px] text-cyan-400 font-bold">Case: {item.caseNumber}</p>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-[9px] font-mono">
              <span className="text-slate-500">SHA-256 HMAC:</span>
              <p className="text-emerald-400 truncate mt-0.5">{item.hash}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => openSection65BModal(item.id)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors text-[10px]"
              >
                VIEW SECTION 65B CERTIFICATE
              </button>
              <button
                onClick={() => alert(`Downloaded certified evidence package for ${item.id}`)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                title="Download Evidence Package"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
