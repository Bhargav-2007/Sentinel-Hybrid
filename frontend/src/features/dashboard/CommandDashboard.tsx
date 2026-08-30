import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { alertService } from '../../services/alertService';
import { useAlertStore } from '../../stores/alertStore';
import { useUIStore } from '../../stores/uiStore';
import { Camera } from '../../types/camera';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { GujaratGISMap } from '../../components/map/GujaratGISMap';
import { 
  Tv2, 
  ShieldAlert, 
  Camera as CameraIcon, 
  Activity, 
  Car, 
  ArrowUpRight, 
  Search, 
  ShieldCheck, 
  FileCheck,
  Radio
} from 'lucide-react';

export const CommandDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, setAlerts } = useAlertStore();
  const { selectedDepartment, openSection65BModal } = useUIStore();
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);

  // 1. Fetch Cameras
  const { data: cameras = [], isLoading: loadingCameras } = useQuery({
    queryKey: ['cameras', selectedDepartment],
    queryFn: () => cameraService.listCameras({ department_id: selectedDepartment, limit: 50 }),
    refetchInterval: 15000,
  });

  // 2. Fetch Alerts
  const { data: initialAlerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertService.listAlerts({ limit: 20 }),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (initialAlerts.length > 0) {
      setAlerts(initialAlerts);
    }
  }, [initialAlerts, setAlerts]);

  // Set default selected camera
  useEffect(() => {
    if (cameras.length > 0 && !selectedCam) {
      setSelectedCam(cameras[0]);
    }
  }, [cameras, selectedCam]);

  const onlineCameras = cameras.filter((c) => c.status === 'ONLINE').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const activePursuits = alerts.filter((a) => a.status === 'INVESTIGATING').length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Top Banner: Statewide Status & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#0a1122] to-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              GUJARAT STATE POLICE COMMAND SITUATION ROOM
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Statewide Unified Video Management & Real-Time AI Threat Correlation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => navigate('/live-wall')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shadow-cyan-500/20"
          >
            <Tv2 className="w-4 h-4" />
            <span>OPEN VIDEO WALL</span>
          </button>
          <button
            onClick={() => navigate('/investigate')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs tracking-wider transition-all"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>360° SEARCH</span>
          </button>
        </div>
      </div>

      {/* 4 High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Cameras */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">LIVE CAMERAS</span>
            <div className="text-2xl font-bold text-slate-100 mt-1 flex items-baseline gap-2">
              <span>{onlineCameras}</span>
              <span className="text-xs text-slate-500">/ 50 SANDBOX</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-sans font-medium">● 80,000+ Scale Ready</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CameraIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active APB Threat Alerts */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">APB HOTLIST ALERTS</span>
            <div className="text-2xl font-bold text-red-400 mt-1 flex items-baseline gap-2">
              <span>{alerts.length}</span>
              <span className="text-xs text-red-500 font-bold">({criticalAlerts} CRITICAL)</span>
            </div>
            <span className="text-[10px] text-red-400/80 font-sans font-medium">eGujCop Watchlist Sync</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: 24h ANPR Sightings */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">24H ANPR SIGHTINGS</span>
            <div className="text-2xl font-bold text-cyan-300 mt-1">142,850</div>
            <span className="text-[10px] text-cyan-400 font-sans font-medium">YOLO11 + PaddleOCR</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Car className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Active Pursuits */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">ACTIVE PURSUITS</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{activePursuits} UNITS</div>
            <span className="text-[10px] text-amber-400/80 font-sans font-medium">Corridor Intercept Mode</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Center Section: Live Video Quad + Gujarat GIS Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Mini Video Quad Wall (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv2 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                TACTICAL FEED MATRIX (LIVE CORP8 CAMERAS)
              </h2>
            </div>
            <button
              onClick={() => navigate('/live-wall')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>EXPAND WALL</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[420px]">
            {cameras.slice(0, 4).map((cam) => (
              <VideoPlayer
                key={cam.id}
                camera={cam}
                isSelected={selectedCam?.id === cam.id}
                onClick={() => setSelectedCam(cam)}
                onSnapshot={() => alert(`Snapshot saved for ${cam.camera_code}`)}
              />
            ))}
          </div>
        </div>

        {/* Right: Gujarat GIS Map (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                GUJARAT GIS SPATIAL SURVEILLANCE
              </h2>
            </div>
            <span className="text-[10px] text-slate-400">POSTGIS CLUSTERS</span>
          </div>

          <div className="h-[420px] rounded-xl overflow-hidden">
            <GujaratGISMap
              cameras={cameras}
              alerts={alerts}
              selectedCameraId={selectedCam?.id}
              onSelectCamera={(cam) => setSelectedCam(cam)}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Real-Time APB Threat Pulse Feed */}
      <div className="flex flex-col gap-3 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              REAL-TIME APB INCIDENT TRIAGE STREAM
            </h3>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>VIEW ALL APB INCIDENTS ({alerts.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {alerts.slice(0, 3).map((alt) => (
            <div
              key={alt.id}
              className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      alt.severity === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {alt.severity}
                  </span>
                  <span className="text-slate-400 text-[10px]">{alt.incident_number}</span>
                </div>
                <span className="text-yellow-300 text-xs font-bold bg-yellow-950/60 px-1.5 py-0.5 rounded border border-yellow-500/30">
                  {alt.detected_plate}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-200 font-sans font-semibold line-clamp-1">{alt.title}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-sans truncate">
                  {alt.camera_name} • {alt.district}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <button
                  onClick={() => openSection65BModal(alt.id)}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  <FileCheck className="w-3 h-3" />
                  <span>SEC 65B</span>
                </button>

                <button
                  onClick={() => navigate('/alerts')}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-slate-700 text-slate-200 text-[10px] font-bold transition-colors"
                >
                  DISPATCH UNIT
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
