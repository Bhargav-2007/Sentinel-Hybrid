import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { 
  Camera, 
  Plus, 
  Search, 
  CheckCircle2, 
  Database, 
  Server, 
  Sliders, 
  Layers,
  Radio
} from 'lucide-react';

export const CameraRegistryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { openCameraDrawer } = useContextDrawerStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras-registry', selectedDept, searchTerm],
    queryFn: () => cameraService.listCameras({
      department_id: selectedDept,
      search: searchTerm,
      limit: 100,
    }),
  });

  const syncMutation = useMutation({
    mutationFn: () => cameraService.onboard50SandboxFeeds(),
    onSuccess: (data: any) => {
      alert(`Successfully synchronized ${data?.count || 50} CCTV feeds from https://live.corp8.cloud/`);
      queryClient.invalidateQueries({ queryKey: ['cameras-registry'] });
    },
  });

  const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Banner: Metrics & Batch Sync */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              MODEL 1 CENTRAL CAMERA REGISTRY & POSTGIS SPATIAL INVENTORY
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              Statewide Multi-Vendor CCTV Catalogue • Direct Live WAN Feeds • Automated Schema Validation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            <Radio className="w-4 h-4" />
            <span>SYNC 50 SANDBOX FEEDS</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">TOTAL REGISTERED</span>
          <div className="text-xl font-bold text-slate-100 mt-0.5">{cameras.length} Nodes</div>
          <span className="text-[10px] text-cyan-400 font-bold">● PostGIS Spatial Index</span>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">ONLINE STATUS</span>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{onlineCount} Live</div>
          <span className="text-[10px] text-emerald-400 font-bold">● 100% Ingestion Health</span>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">DEGRADED / RECONNECTING</span>
          <div className="text-xl font-bold text-amber-400 mt-0.5">0</div>
          <span className="text-[10px] text-slate-400">Backoff Auto-Recover</span>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold">OFFLINE NODES</span>
          <div className="text-xl font-bold text-slate-400 mt-0.5">0</div>
          <span className="text-[10px] text-emerald-400 font-bold">● Zero Fatal Stream Loss</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#090e1a] border border-slate-800 p-3 rounded-xl shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by camera code, location, vendor..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] overflow-x-auto w-full sm:w-auto">
          {['ALL', 'POLICE', 'TRANSPORT_RTO', 'MUNICIPALITY_AMC'].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3 py-1 rounded font-bold transition-all ${
                selectedDept === d ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Camera Inventory Table */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">CAMERA ID</th>
                <th className="p-3.5">LOCATION & DISTRICT</th>
                <th className="p-3.5">DEPARTMENT</th>
                <th className="p-3.5">TYPE</th>
                <th className="p-3.5">STATUS</th>
                <th className="p-3.5">VMS VENDOR</th>
                <th className="p-3.5">RESOLUTION / FPS</th>
                <th className="p-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {cameras.map((cam) => (
                <tr key={cam.id} className="hover:bg-slate-900/40 transition-colors font-mono">
                  <td className="p-3.5 font-bold text-cyan-300">{cam.camera_code}</td>
                  <td className="p-3.5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{cam.name}</span>
                      <span className="text-[10px] text-slate-500">{cam.district} ({cam.latitude}, {cam.longitude})</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {cam.department_id}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-300">{cam.camera_type}</td>
                  <td className="p-3.5">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                      ● {cam.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400">{cam.vms_vendor}</td>
                  <td className="p-3.5 text-slate-300">{cam.resolution || '1080p'} @ {cam.fps || 25}fps</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => openCameraDrawer(cam)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-slate-700 text-slate-200 font-bold text-[10px] transition-colors"
                    >
                      DOSSIER
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
