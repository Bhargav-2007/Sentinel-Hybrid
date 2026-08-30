import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { PTZController } from '../../components/video/PTZController';
import { 
  Camera as CameraIcon, 
  ArrowLeft, 
  ShieldCheck, 
  Activity, 
  Radio, 
  Compass, 
  FileCheck,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const CameraDetailPage: React.FC = () => {
  const { cameraId } = useParams<{ cameraId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ANPR' | 'PERSON' | 'VEHICLE' | 'OBJECT' | 'ALERT'>('ANPR');

  const { data: camera, isLoading } = useQuery({
    queryKey: ['camera-detail', cameraId],
    queryFn: () => cameraService.getCameraById(cameraId || '1'),
  });

  if (isLoading || !camera) {
    return (
      <div className="py-20 text-center text-cyan-400 font-mono animate-pulse">
        Binding Dedicated Stream & AI Telemetry for Camera Node #{cameraId}...
      </div>
    );
  }

  const events = [
    { time: '15:42:28', type: 'ANPR', plate: 'GJ01AB1234', conf: '97.4%', status: 'WATCHLIST MATCH (CRITICAL)' },
    { time: '15:39:11', type: 'VEHICLE', plate: 'GJ01AB1234', conf: '94.1%', status: 'CORRIDOR SPEED 62.1 KM/H' },
    { time: '15:31:04', type: 'PERSON', plate: 'PERSON-TRACK-88', conf: '96.2%', status: 'LOITERING RECOGNIZED' },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto select-none font-mono text-xs">
      {/* Top Bar */}
      <div className="bg-[#090e1a] border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-100 uppercase">{camera.camera_code}</h1>
              <span className="bg-emerald-950 border border-emerald-500/50 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                ● LIVE NODE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">{camera.location_name || camera.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/investigate/vehicle?cam=${camera.id}`)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>TRACE SIGHTINGS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Live Stream + Right Camera Specs & PTZ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Video Player (7 cols) */}
        <div className="lg:col-span-7 h-[420px]">
          <VideoPlayer camera={camera} showHUD={true} />
        </div>

        {/* Right: Camera Telemetry & Spec Sheet (5 cols) */}
        <div className="lg:col-span-5 bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HARDWARE & VMS TELEMETRY</span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-900">
              <div>
                <span className="text-[10px] text-slate-500">DISTRICT / PS</span>
                <p className="font-bold text-slate-200">{camera.district} • {camera.station || 'PS'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">DEPARTMENT</span>
                <p className="font-bold text-cyan-300">{camera.department_id}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">VENDOR & PROTOCOL</span>
                <p className="font-bold text-slate-300">{camera.vms_vendor} (RTSP :8554)</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">RESOLUTION & FPS</span>
                <p className="font-bold text-slate-300">{camera.resolution || '1080p'} @ {camera.fps || 25}fps</p>
              </div>
            </div>
          </div>

          {/* PTZ Embedded Control */}
          <PTZController camera={camera} />
        </div>
      </div>

      {/* AI Events & Timeline Tabs */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-1.5">
            {(['ANPR', 'PERSON', 'VEHICLE', 'OBJECT', 'ALERT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab} EVENTS
              </button>
            ))}
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">● INFERENCE RUNNING (YOLO11)</span>
        </div>

        <div className="space-y-2">
          {events.map((ev, i) => (
            <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">{ev.time}</span>
                <span className="bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-bold">
                  {ev.type}
                </span>
                <span className="font-bold text-yellow-300">{ev.plate}</span>
                <span className="text-slate-400 font-sans">{ev.status}</span>
              </div>
              <span className="text-emerald-400 font-bold">Conf: {ev.conf}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
