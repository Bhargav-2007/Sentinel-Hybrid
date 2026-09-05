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
    const dept = (c.department_name || c.department_id || 'Police').toLowerCase();

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
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col font-sans">
      {/* Map Header & Filter Controls Bar */}
      <div className="p-3.5 rounded-lg bg-police-navy/95 border border-police-sky/20 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-police-blue/15 border border-police-sky/30 text-police-sky shadow-inner">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-white tracking-tight">
                Statewide Tactical GIS Surveillance Grid
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-police-blue/20 border border-police-sky/30 text-police-sky font-semibold tracking-wider font-mono uppercase">
                POSTGIS LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Corridor Vector Mesh &bull; 30 High-Value Junction Nodes Across Gujarat &bull; Dynamic Intercept Vectors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Target Route Toggle */}
          <button
            onClick={() => setShowTargetRoute(!showTargetRoute)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-sm cursor-pointer ${
              showTargetRoute
                ? 'bg-red-800 text-white border-red-600'
                : 'bg-police-navy text-slate-300 border-police-sky/20 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{showTargetRoute ? 'PURSUIT VECTOR ACTIVE' : 'ENABLE PURSUIT VECTOR'}</span>
          </button>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-police-navy border border-police-sky/30 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-police-sky cursor-pointer font-sans"
            >
              <option value="ALL">All Departments (5)</option>
              <option value="POLICE">Gujarat Police (Home Dept)</option>
              <option value="GSRTC">GSRTC State Transport</option>
              <option value="MUNICIPAL">Municipal Corporations</option>
              <option value="HEALTH">Health &amp; Emergency</option>
              <option value="PANCHAYAT">Panchayat &amp; Rural</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-police-navy border border-police-sky/30 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-police-sky cursor-pointer font-sans"
            >
              <option value="ALL">All Gujarat Districts</option>
              <option value="Ahmedabad">Ahmedabad Commissionorate</option>
              <option value="Surat">Surat Commissionorate</option>
              <option value="Vadodara">Vadodara Commissionorate</option>
              <option value="Gandhinagar">Gandhinagar Capital</option>
              <option value="Rajkot">Rajkot Commissionorate</option>
              <option value="Bhavnagar">Bhavnagar</option>
            </select>
          </div>

          {/* Radar Radius Slider */}
          <div className="flex items-center gap-2 text-xs text-slate-300 font-sans">
            <Radar className="w-4 h-4 text-police-sky" />
            <span>Range: {radiusKm} km</span>
            <input
              type="range"
              min="5"
              max="50"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-20 accent-police-sky cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Active Target Pursuit Telemetry Banner */}
      {showTargetRoute && activeTarget && (
        <div className="p-3 rounded-lg bg-police-navy/95 border border-red-600/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-950/80 text-red-400 border border-red-500/40">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-white font-sans">{activeTarget.vehicleMake} {activeTarget.vehicleModel}</span>
                <span className="bg-black text-amber-300 border border-amber-500/60 px-2 py-0.5 rounded font-mono font-extrabold text-xs tracking-wider">
                  {activeTarget.plate}
                </span>
                <span className="text-[10px] text-red-300 font-bold border border-red-500/40 px-2 py-0.5 rounded-full bg-red-950/60 font-mono uppercase">
                  {activeTarget.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                FIR: <b className="text-slate-300 font-mono">{activeTarget.firNo}</b> &bull; {activeTarget.policeStation} &bull; Officer: {activeTarget.officerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Navigation className="w-3.5 h-3.5 text-police-sky" />
              <span>Corridor Nodes: <b className="text-police-sky">{trajectory.length} Checkpoints</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Avg Speed: <b className="text-amber-300">{avgSpeed} km/h</b></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telemetry: <b className="text-emerald-400 font-sans font-semibold">Synchronized</b></span>
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
