import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Radar, Filter, ShieldCheck } from 'lucide-react';
import { camerasApi } from '../../core/api/camerasApi';
import { MapView } from '../../shared/components/MapView';
import { useUIStore } from '../../stores/uiStore';
import { CameraNode } from '../../core/types/camera';

export const StatewideMapPage: React.FC = () => {
  const { openContextDrawer } = useUIStore();
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [radiusKm, setRadiusKm] = useState(5);

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras', selectedDistrict],
    queryFn: () => camerasApi.listCameras(selectedDistrict !== 'ALL' ? { district: selectedDistrict } : undefined),
  });

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      {/* Map Filter Controls Bar */}
      <div className="p-3 rounded bg-sentinel-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-white">Statewide GIS Tactical Surveillance Map</h1>
            <p className="text-xs font-mono text-slate-400">
              PostGIS Geospatial Grid &bull; 30 Active Node Checkpoints Across Gujarat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200"
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

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <Radar className="w-4 h-4 text-cyber-cyan animate-spin" />
            <span>Radius: {radiusKm} km</span>
            <input
              type="range"
              min="1"
              max="25"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-24 accent-cyber-cyan cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Map Canvas */}
      <div className="flex-1 rounded overflow-hidden border border-slate-800 shadow-2xl relative">
        <MapView
          cameras={cameras}
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
        <div className="absolute top-4 left-4 z-10 p-2.5 rounded bg-slate-950/90 backdrop-blur border border-cyber-cyan/30 text-xs font-mono space-y-1 shadow-lg">
          <div className="flex items-center gap-2 text-cyber-cyan font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>POSTGIS GEOSPATIAL COVERAGE</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {cameras.length} Active Surveillance Nodes &bull; 100% Perimeter Locked
          </p>
        </div>
      </div>
    </div>
  );
};
