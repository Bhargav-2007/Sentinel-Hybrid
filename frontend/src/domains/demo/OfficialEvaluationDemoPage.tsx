import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle2, 
  ArrowRight, 
  Tv2, 
  Search, 
  ShieldAlert, 
  MapPin, 
  FileCheck, 
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const OfficialEvaluationDemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const demoSteps = [
    {
      step: 1,
      title: 'CONNECT GOVERNMENT CAMERAS',
      desc: 'Ingests live HLS/RTSP streams from https://live.corp8.cloud/ with automated PostGIS spatial registration.',
      route: '/registry',
      actionLabel: 'OPEN REGISTRY & SYNC',
    },
    {
      step: 2,
      title: 'SHOW LIVE 16-CAMERA WALL',
      desc: 'Renders native multi-grid video matrix with low-latency HLS.js streaming and real-time AI HUD telemetry overlays.',
      route: '/live',
      actionLabel: 'OPEN 16-CAMERA WALL',
    },
    {
      step: 3,
      title: 'SHOW REAL-TIME ANPR RECOGNITION',
      desc: 'PaddleOCR & YOLO11 detect Indian High Security Registration Plates (HSRP) with confidence scoring.',
      route: '/analytics/anpr',
      actionLabel: 'OPEN LIVE ANPR',
    },
    {
      step: 4,
      title: 'TRIGGER WATCHLIST MATCH (GJ01AB1234)',
      desc: 'Automated correlation against eGujCop and VAHAN stolen vehicle databases in under 12ms.',
      route: '/watchlists',
      actionLabel: 'OPEN WATCHLISTS',
    },
    {
      step: 5,
      title: 'CRITICAL APB ALERT GENERATION',
      desc: 'Threat triage center highlights CRITICAL alert with dispatch command actions.',
      route: '/alerts',
      actionLabel: 'OPEN ALERT CENTER',
    },
    {
      step: 6,
      title: 'TRACE TARGET VEHICLE (360°)',
      desc: 'Reconstructs complete timeline across 5 cameras with owner, chassis, and insurance details.',
      route: '/investigate/vehicle?plate=GJ01AB1234',
      actionLabel: 'OPEN VEHICLE TRACE',
    },
    {
      step: 7,
      title: 'GIS CORRIDOR ROUTE VISUALIZATION',
      desc: 'Leaflet GIS situational map displays pulsing camera markers and corridor path.',
      route: '/map',
      actionLabel: 'OPEN GIS MAP',
    },
    {
      step: 8,
      title: 'TIME-AWARE MOVEMENT PLAYBACK',
      desc: 'Interactive step-by-step playback synchronized between video snapshot, PTS timestamp, and speed.',
      route: '/investigate/vehicle?plate=GJ01AB1234',
      actionLabel: 'VIEW MOVEMENT TIMELINE',
    },
    {
      step: 9,
      title: 'GENERATE POLICE INCIDENT DOSSIER',
      desc: 'Creates formalized incident case file #INC-2026-0421 with duty officer dispatch logging.',
      route: '/incidents',
      actionLabel: 'OPEN INCIDENT FILE',
    },
    {
      step: 10,
      title: 'EXPORT SECTION 65B EVIDENCE CERTIFICATE',
      desc: 'Generates legally admissible SHA-256 HMAC cryptographic certificate for court proceedings.',
      route: '/evidence',
      actionLabel: 'VIEW 65B EVIDENCE',
    },
  ];

  const active = demoSteps[currentStep];

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto select-none font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[#090e1a] border border-cyan-500/50 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wide">
              GUJARAT POLICE HACKATHON EVALUATION WALKTHROUGH
            </h1>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              10-Step Interactive Evaluation Story: Ingestion &rarr; ANPR &rarr; Watchlist &rarr; Trace &rarr; Evidence
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentStep(0)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
          title="Restart Demo Sequence"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RESTART</span>
        </button>
      </div>

      {/* Active Step Card */}
      <div className="bg-[#090e1a] border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold px-3 py-1 rounded-full text-xs">
              STEP {active.step} OF 10
            </span>
            <span className="text-[11px] text-emerald-400 font-bold">● LIVE DEMO WORKFLOW</span>
          </div>

          <h2 className="text-lg font-bold text-slate-100 uppercase">{active.title}</h2>
          <p className="text-sm text-slate-300 font-sans leading-relaxed">{active.desc}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => navigate(active.route)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 text-xs"
          >
            <span>{active.actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
            >
              PREVIOUS
            </button>
            <button
              onClick={() => setCurrentStep((prev) => Math.min(demoSteps.length - 1, prev + 1))}
              disabled={currentStep === demoSteps.length - 1}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold disabled:opacity-40"
            >
              NEXT STEP &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Step Sequence Timeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {demoSteps.map((s, idx) => (
          <div
            key={s.step}
            onClick={() => setCurrentStep(idx)}
            className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
              currentStep === idx
                ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-400'
            }`}
          >
            <span className="font-bold text-[10px]">STEP 0{s.step}</span>
            <p className="text-[11px] font-bold text-slate-200 truncate mt-1">{s.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
