import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { alertService } from '../../services/alertService';
import { useRealtimeStore } from '../../core/realtime/websocketService';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { Camera, AlertIncident } from '../../shared/types';
import { GujaratGISMap } from '../../components/map/GujaratGISMap';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { 
  Tv2, 
  ShieldAlert, 
  Camera as CameraIcon, 
  Activity, 
  Car, 
  ArrowUpRight, 
  Search, 
  ShieldCheck, 
  Radio,
  Server,
  Layers
} from 'lucide-react';

export const CommandOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, setAlerts } = useRealtimeStore();
  const { openCameraDrawer, openAlertDrawer, openVehicleDrawer } = useContextDrawerStore();
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);

  // Fetch Cameras
  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => cameraService.listCameras({ limit: 50 }),
    refetchInterval: 15000,
  });

  // Fetch Alerts
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

  useEffect(() => {
    if (cameras.length > 0 && !selectedCam) {
      setSelectedCam(cameras[0]);
    }
  }, [cameras, selectedCam]);

  const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono">
      {/* 1. TOP SYSTEM STATUS BOARD */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100 tracking-wider">
              OPERATIONAL SITUATION BOARD • GUJARAT STATE POLICE
            </span>
          </div>
          <span className="text-[10px] text-slate-400">STATEWIDE UNIFIED VMS CONVERGENCE</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Cameras */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">CAMERAS</span>
            <div className="text-xl font-bold text-slate-100 mt-0.5">50 / 80k</div>
            <span className="text-[10px] text-emerald-400 font-bold">● {onlineCount} ONLINE</span>
          </div>

          {/* Streams */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">STREAMS</span>
            <div className="text-xl font-bold text-cyan-300 mt-0.5">100% WAN</div>
            <span className="text-[10px] text-emerald-400 font-bold">● HLS / TCP :8554</span>
          </div>

          {/* Alerts */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">ACTIVE ALERTS</span>
            <div className="text-xl font-bold text-red-400 mt-0.5">{alerts.length}</div>
            <span className="text-[10px] text-red-400 font-bold">▲ {criticalAlerts.length} CRITICAL</span>
          </div>

          {/* AI Engines */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">AI INFERENCE</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">98.4%</div>
            <span className="text-[10px] text-cyan-400 font-bold">● YOLO11 + ByteTrack</span>
          </div>

          {/* Storage */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">STORAGE (HOT)</span>
            <div className="text-xl font-bold text-amber-300 mt-0.5">24.2%</div>
            <span className="text-[10px] text-emerald-400 font-bold">● 99.97% BW SAVINGS</span>
          </div>
        </div>
      </div>

      {/* 2. CENTER SECTION: VIDEO WALL QUAD + GUJARAT SITUATIONAL MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Video Wall Quad (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv2 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                VIDEO WALL MATRIX (4-CAMERA LAYOUT)
              </h2>
            </div>
            <button
              onClick={() => navigate('/live')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>EXPAND TO 16-WALL</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[430px]">
            {cameras.slice(0, 4).map((cam) => (
              <VideoPlayer
                key={cam.id}
                camera={cam}
                isSelected={selectedCam?.id === cam.id}
                onClick={() => {
                  setSelectedCam(cam);
                  openCameraDrawer(cam);
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: Gujarat GIS Situational Map (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                GUJARAT GIS SITUATIONAL AWARENESS
              </h2>
            </div>
            <button
              onClick={() => navigate('/map')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>FULLSCREEN GIS</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[430px] rounded-xl overflow-hidden border border-slate-800">
            <GujaratGISMap
              cameras={cameras}
              alerts={alerts}
              selectedCameraId={selectedCam?.id}
              onSelectCamera={(cam) => {
                setSelectedCam(cam);
                openCameraDrawer(cam);
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: ACTIVE ALERTS & ACTION COMMAND BAR */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              HIGH-PRIORITY WATCHLIST ALERTS & PURSUITS
            </h3>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>VIEW ALL ALERTS ({alerts.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.slice(0, 3).map((alt) => (
            <div
              key={alt.id}
              onClick={() => openAlertDrawer(alt)}
              className="p-3.5 bg-slate-950 hover:bg-slate-900/90 border border-slate-800 hover:border-red-500/50 rounded-xl cursor-pointer flex flex-col justify-between gap-2.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded text-[10px] font-bold">
                  {alt.severity}
                </span>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (alt.detected_plate) openVehicleDrawer(alt.detected_plate);
                  }}
                  className="font-bold text-yellow-300 bg-yellow-950/60 hover:bg-yellow-900 px-2 py-0.5 rounded border border-yellow-500/40 text-xs"
                >
                  {alt.detected_plate || 'UNKNOWN'}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-xs truncate">{alt.title}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{alt.camera_name} • {alt.district}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px]">
                <span className="text-cyan-400 font-bold">CLICK TO OPEN DOSSIER</span>
                <span className="text-slate-500">{new Date(alt.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
