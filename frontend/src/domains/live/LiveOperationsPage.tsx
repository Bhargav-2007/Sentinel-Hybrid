import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { Camera } from '../../shared/types';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { PTZController } from '../../components/video/PTZController';
import { 
  Tv2, 
  Search, 
  Sliders, 
  Maximize2, 
  Compass, 
  Eye, 
  EyeOff, 
  Radio, 
  Filter,
  CheckCircle2
} from 'lucide-react';

export type WallLayout = '4' | '9' | '16' | '25';

export const LiveOperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { openCameraDrawer, openVehicleDrawer } = useContextDrawerStore();
  const [layout, setLayout] = useState<WallLayout>('16');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [ptzOpen, setPtzOpen] = useState(false);

  // Fetch Cameras
  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras', selectedDept, searchTerm],
    queryFn: () => cameraService.listCameras({
      department_id: selectedDept,
      search: searchTerm,
      limit: 50,
    }),
    refetchInterval: 15000,
  });

  const getGridClass = (l: WallLayout) => {
    switch (l) {
      case '4': return 'grid-cols-1 sm:grid-cols-2 grid-rows-2';
      case '9': return 'grid-cols-2 lg:grid-cols-3 grid-rows-3';
      case '16': return 'grid-cols-2 md:grid-cols-4 grid-rows-4';
      case '25': return 'grid-cols-3 md:grid-cols-5 grid-rows-5';
      default: return 'grid-cols-4 grid-rows-4';
    }
  };

  const slotCount = parseInt(layout, 10);
  const slots = Array.from({ length: slotCount }, (_, i) => i);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] gap-4 select-none max-w-[1920px] mx-auto font-mono text-xs">
      {/* Center Video Wall (Left/Center) */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Top Controls Bar: Layouts, HUD, PTZ, Filters */}
        <div className="bg-[#090e1a] border border-slate-800 px-4 py-2 rounded-xl flex items-center justify-between shadow-md">
          {/* Layout buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">WALL LAYOUT:</span>
            {(['4', '9', '16', '25'] as WallLayout[]).map((l) => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  layout === l
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {l} CAMS
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
            {['ALL', 'POLICE', 'TRANSPORT_RTO', 'MUNICIPALITY_AMC'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDept(d)}
                className={`px-2 py-0.5 rounded ${
                  selectedDept === d ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHudEnabled(!hudEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-colors ${
                hudEnabled
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {hudEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">AI HUD</span>
            </button>

            <button
              onClick={() => setPtzOpen(!ptzOpen)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-colors ${
                ptzOpen
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PTZ KEYPAD</span>
            </button>
          </div>
        </div>

        {/* Video Wall Grid Viewport */}
        <div className={`flex-1 grid gap-2.5 ${getGridClass(layout)} overflow-hidden`}>
          {slots.map((idx) => {
            const cam = cameras[idx % (cameras.length || 1)];
            if (!cam) return null;

            return (
              <div
                key={`${idx}-${cam.id}`}
                className="relative h-full w-full group rounded-xl overflow-hidden"
              >
                <VideoPlayer
                  camera={cam}
                  showHUD={hudEnabled}
                  isSelected={selectedCam?.id === cam.id}
                  onClick={() => {
                    setSelectedCam(cam);
                    openCameraDrawer(cam);
                  }}
                />

                {/* Hover Action Bar: [VIEW] [TRACE] [REPLAY] [SNAPSHOT] [INCIDENT] */}
                <div className="absolute bottom-2 left-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 flex items-center justify-around gap-1 text-[10px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/cameras/${cam.id}`);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 font-bold transition-colors"
                  >
                    VIEW
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/investigate/vehicle?cam=${cam.id}`);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 font-bold transition-colors"
                  >
                    TRACE
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Replay timeline for ${cam.camera_code}`);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 font-bold transition-colors"
                  >
                    REPLAY
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents?cam=${cam.id}`);
                    }}
                    className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-600 text-red-200 hover:text-white font-bold transition-colors"
                  >
                    INCIDENT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Drawer: PTZ & Camera Tree */}
      <div className="w-80 flex flex-col gap-3 shrink-0">
        {ptzOpen && (
          <PTZController
            camera={selectedCam || cameras[0] || null}
            onClose={() => setPtzOpen(false)}
          />
        )}

        {/* Camera Directory Tree */}
        <div className="flex-1 bg-[#090e1a] border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-100 uppercase">CCTV DIRECTORY ({cameras.length})</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">● ONLINE</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search camera code..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {cameras.map((cam) => {
              const isSelected = selectedCam?.id === cam.id;
              return (
                <div
                  key={cam.id}
                  onClick={() => {
                    setSelectedCam(cam);
                    openCameraDrawer(cam);
                  }}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-bold text-xs">{cam.camera_code}</span>
                      <span className="text-[10px] text-slate-500 font-sans">({cam.camera_type})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">{cam.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
