import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { alertService } from '../../services/alertService';
import { useAlertStore } from '../../stores/alertStore';
import { GujaratGISMap } from '../../components/map/GujaratGISMap';
import { Camera } from '../../types/camera';
import { 
  Map, 
  ShieldCheck, 
  Camera as CameraIcon, 
  ShieldAlert, 
  Layers, 
  Activity, 
  Maximize2,
  SlidersHorizontal
} from 'lucide-react';

export const GISMapPage: React.FC = () => {
  const { alerts } = useAlertStore();
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['gis-cameras', selectedDistrict],
    queryFn: () => cameraService.listCameras({ district: selectedDistrict !== 'ALL' ? selectedDistrict : undefined, limit: 100 }),
    refetchInterval: 20000,
  });

  const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;
  const offlineCount = cameras.filter((c) => c.status === 'OFFLINE').length;

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto select-none font-mono h-[calc(100vh-6rem)]">
      {/* Top Controls Bar */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              GUJARAT STATEWIDE GIS SPATIAL SURVEILLANCE MATRIX
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              PostGIS Spatial Indexing • 50+ Camera Checkpoints • Real-Time Pursuit Trajectory Lines
            </p>
          </div>
        </div>

        {/* District Filter & KPIs */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-emerald-400 font-bold">● {onlineCount} ONLINE</span>
            <span className="text-slate-600">|</span>
            <span className="text-red-400 font-bold">● {offlineCount} OFFLINE</span>
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All 33 Districts</option>
            <option value="Ahmedabad City">Ahmedabad City</option>
            <option value="Gandhinagar">Gandhinagar</option>
            <option value="Surat">Surat</option>
            <option value="Vadodara">Vadodara</option>
            <option value="Rajkot">Rajkot</option>
          </select>
        </div>
      </div>

      {/* Full-Height GIS Map Container */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
        <GujaratGISMap
          cameras={cameras}
          alerts={alerts}
          selectedCameraId={selectedCamera?.id}
          onSelectCamera={(cam) => setSelectedCamera(cam)}
          height="100%"
        />

        {/* Selected Camera Details Floating Drawer */}
        {selectedCamera && (
          <div className="absolute top-4 right-4 z-[1000] w-80 bg-[#080d1a]/95 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 animate-fadeIn text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CameraIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-100 font-mono">{selectedCamera.camera_code}</span>
              </div>
              <button
                onClick={() => setSelectedCamera(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="font-bold text-slate-200 font-sans">{selectedCamera.name}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                {selectedCamera.district} • {selectedCamera.station || 'PS'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-[11px]">
              <div>
                <span className="text-[9px] text-slate-500">TYPE</span>
                <p className="text-slate-200 font-bold">{selectedCamera.camera_type}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-500">VMS VENDOR</span>
                <p className="text-slate-200 font-bold">{selectedCamera.vms_vendor || 'NATIVE_RTSP'}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-500">LAT / LNG</span>
                <p className="text-slate-300 font-mono">{selectedCamera.latitude.toFixed(4)}, {selectedCamera.longitude.toFixed(4)}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-500">STREAM FPS</span>
                <p className="text-emerald-400 font-bold">{selectedCamera.fps || 25} FPS</p>
              </div>
            </div>

            <a
              href={`/live-wall`}
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-center transition-colors shadow-md shadow-cyan-500/20"
            >
              EXPAND ON VIDEO WALL
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
