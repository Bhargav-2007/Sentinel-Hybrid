import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { Camera, CameraType } from '../../types/camera';
import { 
  Camera as CameraIcon, 
  Plus, 
  Search, 
  DownloadCloud, 
  ExternalLink
} from 'lucide-react';

export const CameraManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [newCam, setNewCam] = useState({
    name: '',
    camera_code: '',
    location_name: '',
    district: 'Ahmedabad City',
    station: 'Navrangpura PS',
    latitude: 23.0225,
    longitude: 72.5714,
    camera_type: 'ANPR' as CameraType,
    vms_vendor: 'CORP8_LIVE_GATEWAY',
    department_id: 'POLICE',
    rtsp_url: '',
    hls_url: '',
  });

  // 1. Fetch Cameras
  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras', selectedDept, searchTerm],
    queryFn: () => cameraService.listCameras({
      department_id: selectedDept,
      search: searchTerm,
      limit: 50,
    }),
    refetchInterval: 15000,
  });

  const onboardMutation = useMutation({
    mutationFn: () => cameraService.onboard50SandboxFeeds(),
    onSuccess: (data: any) => {
      alert(`Success: Onboarded ${data?.length || data?.count || 50} official Gujarat Sentinel feeds!`);
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });

  // 3. Create Camera Mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Camera>) => cameraService.createCamera(data),
    onSuccess: () => {
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });

  const departments = [
    { code: 'ALL', label: 'All Departments' },
    { code: 'POLICE', label: 'Gujarat Police' },
    { code: 'TRANSPORT_RTO', label: 'Transport / RTO' },
    { code: 'MUNICIPALITY_AMC', label: 'AMC Smart City' },
    { code: 'BORDER_SECURITY', label: 'Border Security' },
    { code: 'FOREST_WILDLIFE', label: 'Forest & Wildlife' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#090e1a] p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <CameraIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              VMS CAMERA INVENTORY & STREAM ONBOARDING
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Statewide CCTV Node Registry • PostGIS Spatial Coordinates • Multi-Vendor Federation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => onboardMutation.mutate()}
            disabled={onboardMutation.isPending}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shadow-emerald-500/20"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{onboardMutation.isPending ? 'ONBOARDING...' : 'SYNC 50 SANDBOX FEEDS'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>ADD CAMERA</span>
          </button>
        </div>
      </div>

      {/* Department Tabs & Search Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {departments.map((dept) => (
            <button
              key={dept.code}
              onClick={() => setSelectedDept(dept.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedDept === dept.code
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search code, junction, district..."
            className="w-full md:w-64 pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Camera Inventory Table */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">STATUS</th>
                <th className="p-3.5">CAMERA CODE</th>
                <th className="p-3.5">NAME / JUNCTION</th>
                <th className="p-3.5">DISTRICT & POLICE STATION</th>
                <th className="p-3.5">TYPE</th>
                <th className="p-3.5">DEPARTMENT</th>
                <th className="p-3.5">STREAM ENDPOINTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {cameras.map((cam) => (
                <tr key={cam.id} className="hover:bg-slate-900/40 transition-colors font-mono">
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          cam.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-red-400'
                        }`}
                      />
                      <span className="text-[11px] font-bold text-slate-300">{cam.status}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-cyan-300">{cam.camera_code}</td>
                  <td className="p-3.5">
                    <div className="flex flex-col font-sans">
                      <span className="font-bold text-slate-200">{cam.name}</span>
                      <span className="text-[11px] text-slate-400">{cam.location_name}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-300 font-sans">
                    {cam.district} • {cam.station || 'PS'}
                  </td>
                  <td className="p-3.5">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      {cam.camera_type}
                    </span>
                  </td>
                  <td className="p-3.5 text-[11px] text-slate-400 font-sans">{cam.department_id}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <a
                        href={cam.hls_url || `https://live.corp8.cloud/live/stream/${cam.stream_id || cam.id}/index.m3u8`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded hover:bg-cyan-900 flex items-center gap-1"
                      >
                        <span>HLS</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="text-[10px] text-slate-500">RTSP :8554</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Camera Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101d] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative flex flex-col gap-4">
            <h2 className="text-sm font-bold font-mono text-cyan-300 uppercase tracking-wider">
              ONBOARD NEW CCTV NODE TO VMS
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newCam);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-[10px] text-slate-400">CAMERA CODE</label>
                <input
                  type="text"
                  required
                  value={newCam.camera_code}
                  onChange={(e) => setNewCam({ ...newCam, camera_code: e.target.value })}
                  placeholder="CAM-AHM-51"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">LOCATION / JUNCTION NAME</label>
                <input
                  type="text"
                  required
                  value={newCam.name}
                  onChange={(e) => setNewCam({ ...newCam, name: e.target.value })}
                  placeholder="Sindhu Bhavan Road Junction"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">LATITUDE</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newCam.latitude}
                    onChange={(e) => setNewCam({ ...newCam, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">LONGITUDE</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newCam.longitude}
                    onChange={(e) => setNewCam({ ...newCam, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  SAVE CAMERA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
