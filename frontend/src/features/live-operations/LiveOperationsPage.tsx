import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Grid3X3, Grid2X2, Cpu, Eye, Filter, Tv2 } from 'lucide-react';
import { camerasApi } from '../../core/api/camerasApi';
import { VideoPlayer } from '../../shared/components/VideoPlayer';
import { useUIStore } from '../../stores/uiStore';
import { CameraNode } from '../../core/types/camera';

export const LiveOperationsPage: React.FC = () => {
  const { gridMode, setGridMode, openContextDrawer } = useUIStore();
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const { data: rawCameras = [], isLoading } = useQuery({
    queryKey: ['cameras', districtFilter],
    queryFn: () => camerasApi.listCameras(districtFilter !== 'ALL' ? { district: districtFilter } : undefined),
    refetchInterval: 20000,
  });

  const cameras = rawCameras.filter((c) => {
    const dept = (c.department_name || c.department_id || 'Police').toLowerCase();

    return (
      deptFilter === 'ALL' ||
      (deptFilter === 'POLICE' && (dept.includes('police') || dept.includes('home'))) ||
      (deptFilter === 'GSRTC' && (dept.includes('transport') || dept.includes('gsrtc') || dept.includes('rto'))) ||
      (deptFilter === 'MUNICIPAL' && (dept.includes('municipal') || dept.includes('urban') || dept.includes('amc'))) ||
      (deptFilter === 'HEALTH' && dept.includes('health')) ||
      (deptFilter === 'PANCHAYAT' && (dept.includes('panchayat') || dept.includes('rural')))
    );
  });

  // Determine active cameras to display
  const displayCount =
    gridMode === '2x2' ? 4 : gridMode === '3x3' ? 9 : gridMode === '4x4' ? 16 : 30;
  const activeCameras = cameras.slice(0, displayCount);

  return (
    <div className="space-y-4 font-mono">
      {/* Action Bar & Grid Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded bg-sentinel-900/90 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Statewide Live Camera Matrix</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
                {activeCameras.length} STREAMS ACTIVE (103.250.160.189)
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Direct RTSP TCP Streams &bull; Independent Node Decoding &bull; Live YOLOv8 Detection Overlays
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan"
            >
              <option value="ALL">All 5 Departments</option>
              <option value="POLICE">Police / Home</option>
              <option value="GSRTC">GSRTC Transport</option>
              <option value="MUNICIPAL">Municipal Corp</option>
              <option value="HEALTH">Health Dept</option>
              <option value="PANCHAYAT">Panchayat & Rural</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-2">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan"
            >
              <option value="ALL">All Districts (30 Nodes)</option>
              <option value="Ahmedabad">Ahmedabad City</option>
              <option value="Surat">Surat City</option>
              <option value="Vadodara">Vadodara</option>
              <option value="Gandhinagar">Gandhinagar</option>
              <option value="Rajkot">Rajkot</option>
            </select>
          </div>

          {/* Grid Layout Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setGridMode('2x2')}
              className={`p-1.5 rounded transition-colors ${
                gridMode === '2x2' ? 'bg-cyber-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="2x2 Grid (4 Cameras)"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('3x3')}
              className={`p-1.5 rounded transition-colors ${
                gridMode === '3x3' ? 'bg-cyber-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="3x3 Grid (9 Cameras)"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('4x4')}
              className={`p-1.5 rounded transition-colors ${
                gridMode === '4x4' ? 'bg-cyber-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="4x4 Grid (16 Cameras)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('all30')}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition-colors flex items-center gap-1 ${
                gridMode === 'all30' ? 'bg-cyber-cyan text-black' : 'text-slate-400 hover:text-white'
              }`}
              title="All 30 Cameras Grid"
            >
              <Tv2 className="w-3.5 h-3.5" />
              <span>ALL 30</span>
            </button>
          </div>
        </div>
      </div>

      {/* Video Wall Matrix */}
      {isLoading ? (
        <div className="h-96 flex items-center justify-center bg-sentinel-900/60 rounded border border-slate-800">
          <div className="text-center font-mono text-xs text-cyber-cyan space-y-2">
            <Cpu className="w-8 h-8 animate-spin mx-auto text-cyber-cyan" />
            <p>Connecting to Sentinel Camera Grid (103.250.160.189)...</p>
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            gridMode === '2x2'
              ? 'grid-cols-1 md:grid-cols-2'
              : gridMode === '3x3'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : gridMode === '4x4'
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
          }`}
        >
          {activeCameras.map((cam: CameraNode, idx: number) => {
            const camNumber = idx + 1;
            const camTag = `cam${String(camNumber).padStart(2, '0')}`;
            return (
              <div
                key={cam.camera_id}
                onClick={() =>
                  openContextDrawer({
                    camera: cam,
                  })
                }
                className="cursor-pointer"
              >
                <VideoPlayer
                  cameraId={camTag}
                  cameraName={`${cam.name}`}
                  isThreat={cam.metadata?.live_status === 'ALERT'}
                  overlayText={`NODE ${camTag.toUpperCase()}`}
                  onInspect={() =>
                    openContextDrawer({
                      camera: cam,
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
