import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trackingService } from '../../services/trackingService';
import { 
  Search, 
  Car, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Clock, 
  Navigation,
  FileCheck,
  Radio
} from 'lucide-react';

export const VehicleInvestigationPage: React.FC = () => {
  const [searchPlate, setSearchPlate] = useState('GJ01AB1234');
  const [activePlate, setActivePlate] = useState('GJ01AB1234');
  
  // Route playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['vehicle-investigate', activePlate],
    queryFn: () => trackingService.getVehicle360(activePlate),
    enabled: Boolean(activePlate),
  });

  const encounters = profile?.trajectory_history?.encounters || [];

  // Playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && encounters.length > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % encounters.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, encounters.length]);

  const activeEncounter = encounters[currentStep] || encounters[0] || null;

  return (
    <div className="flex flex-col gap-4 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Search Banner */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              360° VEHICLE INVESTIGATION & CHRONOLOGICAL ROUTE TRACE
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              VAHAN Database Match • Cross-Camera PTS Sighting Sequence • Speed Correlation
            </p>
          </div>
        </div>

        {/* Search input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchPlate.trim()) setActivePlate(searchPlate.trim().toUpperCase());
          }}
          className="flex items-center gap-2 w-full md:w-auto"
        >
          <input
            type="text"
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
            placeholder="e.g. GJ01AB1234"
            className="w-full md:w-56 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-yellow-300 font-bold text-xs tracking-wider focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors shrink-0"
          >
            TRACE
          </button>
        </form>
      </div>

      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: VEHICLE PROFILE CARD & VAHAN SPECS (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Target Status Header */}
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/60 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-red-400 animate-pulse" />
                <div>
                  <span className="text-xs font-bold text-red-300">WANTED HOTLIST MATCH</span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">eGujCop Armed Robbery FIR 881/2026</p>
                </div>
              </div>
              <span className="text-base font-bold text-yellow-300 bg-black/60 px-3 py-1 rounded border border-yellow-500/40">
                {profile.plate}
              </span>
            </div>

            {/* VAHAN Card */}
            <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">VAHAN NATIONAL REGISTRY</span>
                <span className="text-[10px] text-cyan-400">RTO GUJARAT</span>
              </div>

              {profile.vahan_registration && (
                <div className="space-y-2 text-[11px]">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                    <span className="text-[10px] text-slate-500">OWNER NAME</span>
                    <p className="font-bold text-slate-200">{profile.vahan_registration.owner_name}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                    <span className="text-[10px] text-slate-500">VEHICLE MAKE & MODEL</span>
                    <p className="font-bold text-slate-200">{profile.vahan_registration.maker_model}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                    <div>
                      <span className="text-[10px] text-slate-500">CHASSIS</span>
                      <p className="text-slate-300 font-mono text-[10px]">{profile.vahan_registration.chassis_number}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">INSURANCE</span>
                      <p className="text-emerald-400 font-bold">{profile.vahan_registration.insurance_valid_upto}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <button
              onClick={() => alert(`Exported Section 65B Certificate for ${profile.plate}`)}
              className="py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <FileCheck className="w-4 h-4" />
              <span>EXPORT SECTION 65B EVIDENCE</span>
            </button>
          </div>

          {/* RIGHT: TIME-AWARE PLAYBACK & ROUTE TIMELINE (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Time-aware Player Controls Bar */}
            <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'PAUSE ROUTE' : 'PLAY ROUTE'}</span>
                </button>

                <button
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 transition-colors"
                  title="Previous Sighting"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setCurrentStep((prev) => Math.min(encounters.length - 1, prev + 1))}
                  className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 transition-colors"
                  title="Next Sighting"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                <span>Checkpoint <strong>#{currentStep + 1}</strong> of {encounters.length}</span>
                <span className="text-slate-500">•</span>
                <span className="text-cyan-400 font-bold">{activeEncounter?.camera_name}</span>
              </div>
            </div>

            {/* Active Sighting Preview & Map Sighting Track */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active Sighting Video Snapshot */}
              <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">ACTIVE SIGHTING NODE</span>
                  <span className="text-emerald-400 font-bold">PTS: {activeEncounter?.pts_timestamp_ms}ms</span>
                </div>

                <div className="my-3 aspect-video bg-black rounded-xl border border-cyan-500/40 relative overflow-hidden flex items-center justify-center">
                  <video
                    src={`https://live.corp8.cloud/stream/${activeEncounter?.camera_id || '1'}`}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-500/40 text-yellow-300 font-bold text-[10px]">
                    ANPR MATCH: {profile.plate} (97.4%)
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Speed: <strong className="text-cyan-300">{activeEncounter?.speed_kmh} km/h</strong></span>
                  <span>{new Date(activeEncounter?.sighted_at || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Movement Timeline Sequence */}
              <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-2">
                  CHRONOLOGICAL MOVEMENT HISTORY
                </span>

                <div className="space-y-2 my-2 overflow-y-auto max-h-56 pr-1">
                  {encounters.map((enc, idx) => (
                    <div
                      key={enc.id}
                      onClick={() => setCurrentStep(idx)}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        currentStep === idx
                          ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-cyan-400">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200 text-xs">{enc.camera_name}</p>
                          <p className="text-[10px] text-slate-500 font-sans">{enc.district}</p>
                        </div>
                      </div>
                      <span className="text-cyan-400 text-[10px] font-bold">{enc.speed_kmh} km/h</span>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2">
                  Corridor Average Speed: <strong className="text-cyan-300">56.1 km/h</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
