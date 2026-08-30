import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { useVideoWallStore, VideoGridLayout } from '../../stores/videoWallStore';
import { useUIStore } from '../../stores/uiStore';
import { Camera } from '../../types/camera';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { PTZController } from '../../components/video/PTZController';
import { 
  Tv2, 
  Compass, 
  Search, 
  Radio, 
  Eye, 
  EyeOff, 
  Sliders
} from 'lucide-react';

export const LiveVideoWallPage: React.FC = () => {
  const { 
    layout, 
    setLayout, 
    slotAssignments, 
    assignCameraToSlot, 
    hudEnabled, 
    toggleHud,
    selectedSlotIndex,
    setSelectedSlotIndex,
    selectedCamera,
    setSelectedCamera,
    ptzControlOpen,
    togglePtzControl
  } = useVideoWallStore();

  const { selectedDepartment } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all cameras
  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras', selectedDepartment, searchTerm],
    queryFn: () => cameraService.listCameras({ 
      department_id: selectedDepartment, 
      search: searchTerm,
      limit: 50 
    }),
    refetchInterval: 20000,
  });

  const getGridClass = (l: VideoGridLayout) => {
    switch (l) {
      case '1x1':
        return 'grid-cols-1 grid-rows-1';
      case '2x2':
        return 'grid-cols-1 sm:grid-cols-2 grid-rows-2';
      case '3x3':
        return 'grid-cols-2 lg:grid-cols-3 grid-rows-3';
      case '4x4':
        return 'grid-cols-2 lg:grid-cols-4 grid-rows-4';
      case '1+5':
        return 'grid-cols-3 grid-rows-3';
      case '1+7':
        return 'grid-cols-4 grid-rows-4';
      default:
        return 'grid-cols-2 grid-rows-2';
    }
  };

  const getSlotCount = (l: VideoGridLayout) => {
    switch (l) {
      case '1x1': return 1;
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      case '1+5': return 6;
      case '1+7': return 8;
      default: return 4;
    }
  };

  const slotCount = getSlotCount(layout);
  const slots = Array.from({ length: slotCount }, (_, i) => i);

  const handleCameraClick = (cam: Camera, slotIdx: number) => {
    setSelectedSlotIndex(slotIdx);
    setSelectedCamera(cam);
  };

  const handleAssignFromSidebar = (cam: Camera) => {
    assignCameraToSlot(selectedSlotIndex, cam.id);
    setSelectedCamera(cam);
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] gap-4 select-none max-w-[1920px] mx-auto font-mono">
      {/* Main Video Wall Grid Area (Left / Center) */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Top Control Bar: Layout Selectors, HUD Toggle, PTZ Toggle */}
        <div className="flex items-center justify-between bg-[#090e1a] border border-slate-800 px-4 py-2.5 rounded-xl shadow-md">
          {/* Left: Layout Switchers */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-bold mr-1 hidden sm:inline">GRID LAYOUT:</span>
            {(['1x1', '2x2', '3x3', '4x4', '1+5', '1+7'] as VideoGridLayout[]).map((l) => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  layout === l
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Right: HUD, PTZ, Active Stream Stats */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleHud}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                hudEnabled
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {hudEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">AI HUD</span>
            </button>

            <button
              onClick={togglePtzControl}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                ptzControlOpen
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PTZ TELEMETRY</span>
            </button>
          </div>
        </div>

        {/* Video Wall Viewport */}
        <div className={`flex-1 grid gap-2.5 ${getGridClass(layout)} overflow-hidden`}>
          {slots.map((slotIdx) => {
            const camId = slotAssignments[slotIdx] || String(slotIdx + 1);
            const camera = cameras.find((c) => c.id === camId) || cameras[slotIdx % (cameras.length || 1)];

            if (!camera) {
              return (
                <div
                  key={slotIdx}
                  onClick={() => setSelectedSlotIndex(slotIdx)}
                  className={`bg-slate-950 rounded-lg border flex flex-col items-center justify-center p-4 text-center cursor-pointer ${
                    selectedSlotIndex === slotIdx
                      ? 'border-cyan-400 ring-2 ring-cyan-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Tv2 className="w-8 h-8 text-slate-600 mb-2" />
                  <span className="text-xs text-slate-400">SLOT #{slotIdx + 1} (EMPTY)</span>
                  <span className="text-[10px] text-slate-500 mt-1">Select a camera from the tree to bind</span>
                </div>
              );
            }

            return (
              <VideoPlayer
                key={`${slotIdx}-${camera.id}`}
                camera={camera}
                showHUD={hudEnabled}
                isSelected={selectedSlotIndex === slotIdx}
                onClick={() => handleCameraClick(camera, slotIdx)}
                onSnapshot={() => alert(`Snapshot captured for ${camera.camera_code}`)}
              />
            );
          })}
        </div>
      </div>

      {/* Right: Camera Tree Selector & PTZ Drawer */}
      <div className="w-80 flex flex-col gap-3 shrink-0">
        {/* PTZ Panel (if toggled) */}
        {ptzControlOpen && (
          <PTZController
            camera={selectedCamera || cameras[0] || null}
            onClose={() => togglePtzControl()}
          />
        )}

        {/* Camera Selector Tree */}
        <div className="flex-1 bg-[#090e1a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                VMS CAMERA TREE ({cameras.length})
              </h3>
            </div>
            <span className="text-[10px] text-cyan-400 font-bold">SLOT #{selectedSlotIndex + 1}</span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search camera code or junction..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Camera List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {cameras.map((cam) => {
              const isAssigned = Object.values(slotAssignments).includes(cam.id);
              const isSelected = selectedCamera?.id === cam.id;

              return (
                <button
                  key={cam.id}
                  onClick={() => handleAssignFromSidebar(cam)}
                  className={`w-full p-2 rounded-lg border text-left flex items-center justify-between gap-2 transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="font-bold text-xs truncate">{cam.camera_code}</span>
                      <span className="text-[10px] text-slate-500 font-sans truncate">({cam.camera_type})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">{cam.name}</span>
                  </div>

                  {isAssigned && (
                    <span className="text-[9px] bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded border border-slate-700 font-bold shrink-0">
                      ON WALL
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
