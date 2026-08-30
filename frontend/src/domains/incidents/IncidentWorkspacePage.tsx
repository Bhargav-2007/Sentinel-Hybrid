import React, { useState } from 'react';
import { 
  FolderOpen, 
  Clock, 
  ShieldAlert, 
  Camera, 
  Car, 
  FileCheck, 
  FileText, 
  Plus, 
  CheckCircle2,
  Activity
} from 'lucide-react';

export const IncidentWorkspacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMELINE' | 'EVIDENCE' | 'NOTES'>('OVERVIEW');

  const timelineSteps = [
    { time: '15:21:00', title: 'Alert Generated', desc: 'Watchlist match on CAM-042 (SG Highway) for GJ01AB1234' },
    { time: '15:22:15', title: 'Alert Acknowledged', desc: 'Duty Officer POLICE-AHM-042 dispatched PCR Unit Eagle-07' },
    { time: '15:25:40', title: 'Vehicle Traced', desc: 'Cross-camera route reconstructed across CAM-001, CAM-008, CAM-019' },
    { time: '15:31:10', title: 'Investigation Created', desc: 'Case file FIR-2026-CR-0881 formalized with VAHAN data' },
    { time: '15:33:00', title: 'Evidence Attached', desc: 'Section 65B Certified SHA-256 HMAC video clips locked to custody' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-100 uppercase">INCIDENT #INC-2026-0421</h1>
              <span className="bg-red-950 border border-red-500/50 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                PURSUIT ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Armed Heist Suspect Intercept • Primary Target: GJ01AB1234 • FIR-2026-CR-0881
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Exported Full Incident Case Briefing PDF')}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <FileCheck className="w-4 h-4" />
            <span>EXPORT DOSSIER BRIEF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {(['OVERVIEW', 'TIMELINE', 'EVIDENCE', 'NOTES'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === tab
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-[#090e1a] border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
              INCIDENT SYNOPSIS & CORRELATED ASSETS
            </h3>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              On 29 Aug 2026, target vehicle <strong>GJ01AB1234</strong> (White Toyota Fortuner) triggered a CRITICAL eGujCop stolen vehicle alert on CAM-042 (SG Highway). Cross-camera trajectory confirmed subsequent sightings on CAM-008 and CAM-019 traveling northbound at 58.4 km/h average speed. PCR units mobilized for corridor intercept.
            </p>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-900">
              <div>
                <span className="text-[10px] text-slate-500 font-bold">CASE LEAD OFFICER</span>
                <p className="font-bold text-slate-200 mt-0.5">Inspector R.K. Jadeja (POLICE-AHM-042)</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold">DISPATCHED UNITS</span>
                <p className="font-bold text-amber-400 mt-0.5">PCR Eagle-07 • Gandhinagar Highway Intercept</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#090e1a] border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
              CRITICAL EVIDENCE SUMMARY
            </h3>
            <div className="space-y-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">ANPR Video Clip (1080p)</span>
                <span className="text-emerald-400 font-bold text-[10px]">SEC 65B VERIFIED</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">VAHAN Registration Dossier</span>
                <span className="text-emerald-400 font-bold text-[10px]">MATCHED</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Corridor Speed Graph</span>
                <span className="text-cyan-400 font-bold text-[10px]">ATTACHED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-100 uppercase border-b border-slate-800 pb-2">
            OPERATIONAL CASE EVENT LOG (TIME-SEQUENCED)
          </h3>
          <div className="space-y-3 pl-2 border-l-2 border-cyan-500/40">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="relative pl-4 space-y-1">
                <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-cyan-400 border-2 border-black" />
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300 font-bold">{step.time} IST</span>
                  <span className="font-bold text-slate-100">{step.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: EVIDENCE */}
      {activeTab === 'EVIDENCE' && (
        <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl shadow-xl text-slate-400 text-center py-12">
          Evidence items linked to this incident are mirrored into the Section 65B Forensic Vault.
        </div>
      )}

      {/* Tab 4: NOTES */}
      {activeTab === 'NOTES' && (
        <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
          <textarea
            rows={4}
            placeholder="Add duty officer case notes..."
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            defaultValue="Suspect vehicle crossed SG Highway toward Gandhinagar corridor. Checkpoint 3 notified."
          />
          <button className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs">
            SAVE NOTE TO AUDIT TRAIL
          </button>
        </div>
      )}
    </div>
  );
};
