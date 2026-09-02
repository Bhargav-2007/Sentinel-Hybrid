import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Radar,
  Filter,
  ShieldCheck,
  Navigation,
  Activity,
  Gauge,
  Clock,
  Eye,
  Crosshair,
} from 'lucide-react';
import { camerasApi } from '../../core/api/camerasApi';
import { MapView } from '../../shared/components/MapView';
import { useUIStore } from '../../stores/uiStore';
import { useTargetStore } from '../../stores/targetStore';
import { CameraNode } from '../../core/types/camera';

export const StatewideMapPage: React.FC = () => {
  const { openContextDrawer } = useUIStore();
  const { activeTarget } = useTargetStore();
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [showTargetRoute, setShowTargetRoute] = useState(true);
  const [radiusKm, setRadiusKm] = useState(15);

  const { data: rawCameras = [] } = useQuery({
    queryKey: ['cameras', selectedDistrict],
    queryFn: () => camerasApi.listCameras(selectedDistrict !== 'ALL' ? { district: selectedDistrict } : undefined),
  });

  const cameras = rawCameras.filter((c) => {
    const camNum = parseInt(c.camera_id.replace(/\D/g, '') || '1', 10);
    const dept = (
      c.department_name ||
      (camNum % 5 === 0
        ? 'panchayat'
        : camNum % 4 === 0
        ? 'health'
        : camNum % 3 === 0
        ? 'municipal'
        : camNum % 2 === 0
        ? 'gsrtc'
        : 'police')
    ).toLowerCase();

    return (
      selectedDept === 'ALL' ||
      (selectedDept === 'POLICE' && (dept.includes('police') || dept.includes('home'))) ||
      (selectedDept === 'GSRTC' && (dept.includes('transport') || dept.includes('gsrtc'))) ||
      (selectedDept === 'MUNICIPAL' && (dept.includes('municipal') || dept.includes('urban'))) ||
      (selectedDept === 'HEALTH' && dept.includes('health')) ||
      (selectedDept === 'PANCHAYAT' && (dept.includes('panchayat') || dept.includes('rural')))
    );
  });

  const trajectory = showTargetRoute && activeTarget?.trajectory ? activeTarget.trajectory : [];
  const avgSpeed =
    trajectory.length > 0
      ? Math.round(
          trajectory.reduce((acc, curr) => acc + (curr.speed_kmh || 0), 0) / trajectory.length
        )
      : 0;

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col font-mono">
      {/* Map Header & Filter Controls Bar */}
      <div className="p-3 rounded bg-sentinel-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>Statewide GIS Tactical Surveillance Map</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                POSTGIS LIVE
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Corridor Vector Grid &bull; 30 Active Node Checkpoints Across Gujarat &bull; Dynamic Pursuit Flight Path
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Target Route Toggle */}
          <button
            onClick={() => setShowTargetRoute(!showTargetRoute)}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              showTargetRoute
                ? 'bg-cyber-crimson text-white border-cyber-crimson shadow-glow-crimson'
                : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{showTargetRoute ? 'TARGET ROUTE ACTIVE' : 'SHOW TARGET ROUTE'}</span>
          </button>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan"
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
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan"
            >
              <option value="ALL">All Gujarat Districts</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Surat">Surat</option>
              <option value="Vadodara">Vadodara</option>
              <option value="Gandhinagar">Gandhinagar</option>
              <option value="Rajkot">Rajkot</option>
              <option value="Bhavnagar">Bhavnagar</option>
            </select>
          </div>

          {/* Radar Radius Slider */}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Radar className="w-4 h-4 text-cyber-cyan animate-spin" />
            <span>Radar: {radiusKm} km</span>
            <input
              type="range"
              min="5"
              max="50"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-20 accent-cyber-cyan cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Active Target Pursuit Telemetry Banner */}
      {showTargetRoute && activeTarget && (
        <div className="p-3 rounded bg-slate-950 border border-cyber-crimson/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-red-950 text-cyber-crimson border border-red-800 animate-pulse">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{activeTarget.vehicleMake} {activeTarget.vehicleModel}</span>
                <span className="bg-yellow-400 text-black px-1.5 py-0.2 rounded font-extrabold text-[11px]">
                  {activeTarget.plate}
                </span>
                <span className="text-[10px] text-cyber-crimson font-bold border border-cyber-crimson px-1.5 rounded bg-red-950/40">
                  {activeTarget.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                FIR: {activeTarget.firNo} &bull; {activeTarget.policeStation} &bull; Officer: {activeTarget.officerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Navigation className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Corridor Nodes: <b className="text-cyber-cyan">{trajectory.length} Checkpoints</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-yellow-400" />
              <span>Avg Speed: <b className="text-yellow-400">{avgSpeed} km/h</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telemetry: <b className="text-emerald-400">Synchronized</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Map Canvas */}
      <div className="flex-1 rounded overflow-hidden border border-slate-800 shadow-2xl relative">
        <MapView
          cameras={cameras}
          trajectory={trajectory}
          targetPlate={activeTarget?.plate}
          onCameraSelect={(cam: CameraNode) =>
            openContextDrawer({
              camera: cam,
            })
          }
          center={[23.0225, 72.5714]}
          zoom={11}
          height="h-full"
        />

        {/* Floating Coverage Pill */}
        <div className="absolute top-4 left-4 z-10 p-2.5 rounded bg-slate-950/90 backdrop-blur border border-cyber-cyan/30 text-xs space-y-1 shadow-lg pointer-events-none">
          <div className="flex items-center gap-2 text-cyber-cyan font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>STATEWIDE CCTV GRID COVERAGE</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {cameras.length} Active Gujarat Nodes &bull; {showTargetRoute ? 'Corridor Flight Path Connected' : 'Grid Surveillance Active'}
          </p>
        </div>
      </div>
    </div>
  );
};
