import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { alertService } from '../../services/alertService';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { Camera, AlertIncident } from '../../shared/types';
import { GujaratGISMap } from '../../components/map/GujaratGISMap';
import { 
  MapPin, 
  Filter, 
  Layers, 
  ShieldCheck, 
  Search, 
  Tv2, 
  Radio,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';

export const GujaratSituationalMapPage: React.FC = () => {
  const { openCameraDrawer, openVehicleDrawer } = useContextDrawerStore();
  const [selectedCam, setSelectedCam] = useState<Camera | null>(null);

  // Filter States
  const [filters, setFilters] = useState({
    police: true,
    rto: true,
    amc: true,
    online: true,
    degraded: true,
    anprOnly: false,
    criticalAlertsOnly: false,
  });

  // Fetch Cameras
  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => cameraService.listCameras({ limit: 50 }),
  });

  // Fetch Alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertService.listAlerts({ limit: 20 }),
  });

  const filteredCameras = cameras.filter((c) => {
    if (!filters.police && c.department_id === 'POLICE') return false;
    if (!filters.rto && c.department_id === 'TRANSPORT_RTO') return false;
    if (!filters.amc && c.department_id === 'MUNICIPALITY_AMC') return false;
    if (filters.anprOnly && c.camera_type !== 'ANPR') return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-6.5rem)] gap-4 select-none max-w-[1920px] mx-auto font-mono text-xs">
      {/* Left Filter Drawer */}
      <div className="w-72 bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl shrink-0 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wider">GIS LAYER FILTERS</span>
          </div>

          {/* Department Filter */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Departments</span>
            <div className="space-y-1.5 pl-1">
              {[
                { id: 'police', label: 'Gujarat Police' },
                { id: 'rto', label: 'Transport / RTO' },
                { id: 'amc', label: 'Municipal / AMC' },
              ].map((d) => (
                <label key={d.id} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={(filters as any)[d.id]}
                    onChange={(e) => setFilters({ ...filters, [d.id]: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Node Status</span>
            <div className="space-y-1.5 pl-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-cyan-300">
                <input
                  type="checkbox"
                  checked={filters.online}
                  onChange={(e) => setFilters({ ...filters, online: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-900 border-slate-700"
                />
                <span>Online Cameras</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-cyan-300">
                <input
                  type="checkbox"
                  checked={filters.anprOnly}
                  onChange={(e) => setFilters({ ...filters, anprOnly: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-900 border-slate-700"
                />
                <span>ANPR Nodes Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* GIS Metadata Summary */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
          <p>Visible Nodes: <strong className="text-cyan-300">{filteredCameras.length}</strong> / 50</p>
          <p>Active APB Pins: <strong className="text-red-400">{alerts.length}</strong></p>
          <p>Projection: EPSG:4326 (PostGIS)</p>
        </div>
      </div>

      {/* Center Map Canvas */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
        <GujaratGISMap
          cameras={filteredCameras}
          alerts={alerts}
          selectedCameraId={selectedCam?.id}
          onSelectCamera={(cam) => {
            setSelectedCam(cam);
            openCameraDrawer(cam);
          }}
          height="100%"
        />
      </div>
    </div>
  );
};
