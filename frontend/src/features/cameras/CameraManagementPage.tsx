import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, RefreshCw, Eye, CheckCircle2, XCircle, Search, Filter, Building2, Shield, Bus, HeartPulse, Landmark } from 'lucide-react';
import { camerasApi } from '../../core/api/camerasApi';
import { useUIStore } from '../../stores/uiStore';
import { CameraNode } from '../../core/types/camera';

export const CameraManagementPage: React.FC = () => {
  const { openContextDrawer } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const { data: cameras = [], isLoading, refetch } = useQuery({
    queryKey: ['cameras-grid', districtFilter],
    queryFn: () => camerasApi.listCameras(districtFilter !== 'ALL' ? { district: districtFilter } : undefined),
  });

  const filtered = cameras.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.camera_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.district.toLowerCase().includes(searchTerm.toLowerCase());

    const dept = (c.department_name || c.department_id || 'Police').toLowerCase();
    const matchesDept =
      deptFilter === 'ALL' ||
      (deptFilter === 'POLICE' && (dept.includes('police') || dept.includes('home'))) ||
      (deptFilter === 'GSRTC' && (dept.includes('transport') || dept.includes('gsrtc'))) ||
      (deptFilter === 'MUNICIPAL' && (dept.includes('municipal') || dept.includes('urban'))) ||
      (deptFilter === 'HEALTH' && dept.includes('health')) ||
      (deptFilter === 'PANCHAYAT' && (dept.includes('panchayat') || dept.includes('rural')));

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              Model 1 & 2: Statewide Central CCTV Registry & Multi-Department Grid
            </h1>
            <p className="text-xs text-slate-400">
              Federated Integration of 5 Key Gujarat Departments: Police • GSRTC • Municipal • Health • Panchayat
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH HEALTH</span>
        </button>
      </div>

      {/* Department Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {[
          { label: 'Police / Home', count: '12 Nodes', icon: <Shield className="w-3.5 h-3.5 text-cyber-cyan" />, id: 'POLICE' },
          { label: 'GSRTC Transport', count: '6 Nodes', icon: <Bus className="w-3.5 h-3.5 text-yellow-400" />, id: 'GSRTC' },
          { label: 'Municipal Corp', count: '5 Nodes', icon: <Building2 className="w-3.5 h-3.5 text-blue-400" />, id: 'MUNICIPAL' },
          { label: 'Health Dept', count: '4 Nodes', icon: <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />, id: 'HEALTH' },
          { label: 'Panchayat & Rural', count: '3 Nodes', icon: <Landmark className="w-3.5 h-3.5 text-purple-400" />, id: 'PANCHAYAT' },
        ].map((d) => (
          <button
            key={d.id}
            onClick={() => setDeptFilter(deptFilter === d.id ? 'ALL' : d.id)}
            className={`p-2 rounded border text-left transition-all flex items-center justify-between cursor-pointer ${
              deptFilter === d.id
                ? 'bg-cyber-cyan text-black border-cyber-cyan font-bold shadow-md'
                : 'bg-sentinel-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {d.icon}
              <span className="truncate text-[11px]">{d.label}</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/40 text-slate-200 shrink-0">
              {d.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="p-3 rounded bg-sentinel-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Camera, Junction, or Dept..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="ALL">All 5 Departments</option>
              <option value="POLICE">Home / Police Dept</option>
              <option value="GSRTC">GSRTC (State Transport)</option>
              <option value="MUNICIPAL">Municipal Corporations</option>
              <option value="HEALTH">Health Department</option>
              <option value="PANCHAYAT">Panchayat & Rural</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200"
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
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center font-mono text-xs text-cyber-cyan">
          Connecting to Camera Catalogue...
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-800 bg-sentinel-900">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Camera Node</th>
                <th className="p-3">Department</th>
                <th className="p-3">District / Junction</th>
                <th className="p-3">Vendor / Codec</th>
                <th className="p-3">Stream Protocol (TCP/WHEP)</th>
                <th className="p-3">Health Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((cam: CameraNode) => {
                const isOnline = cam.status === 'ONLINE';
                const camNum = parseInt(cam.camera_id.replace(/\D/g, '') || '1', 10);
                const deptName =
                  cam.department_name ||
                  (camNum % 5 === 0
                    ? 'Panchayat & Rural'
                    : camNum % 4 === 0
                    ? 'Health Dept'
                    : camNum % 3 === 0
                    ? 'Municipal Corp'
                    : camNum % 2 === 0
                    ? 'GSRTC Transport'
                    : 'Police / Home');

                return (
                  <tr key={cam.camera_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{cam.name}</div>
                      <div className="text-[10px] text-slate-500">{cam.camera_id}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyber-cyan font-bold text-[10px]">
                        {deptName}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-300">{cam.location.district}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs">{cam.location.address}</div>
                    </td>
                    <td className="p-3">
                      <span className="text-slate-300">{cam.vendor}</span> &bull;{' '}
                      <span className="text-cyber-cyan uppercase font-bold">{cam.codec}</span>
                    </td>
                    <td className="p-3">
                      <code className="text-[10px] text-slate-400 bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                        {cam.rtsp_url}
                      </code>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isOnline ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-cyber-crimson" />
                        )}
                        <span className={`font-bold ${isOnline ? 'text-emerald-400' : 'text-cyber-crimson'}`}>
                          {cam.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openContextDrawer({ camera: cam })}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyber-cyan hover:text-black text-slate-200 font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>PREVIEW</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
