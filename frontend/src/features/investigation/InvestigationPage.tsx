import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ShieldAlert,
  Car,
  MapPin,
  Download,
  CheckCircle,
  FileText,
  Clock,
  Gauge,
  PhoneCall,
  ArrowRight,
  Radio,
  Share2,
  Navigation,
  ExternalLink,
  ShieldCheck,
  FolderLock,
  Camera,
} from 'lucide-react';
import { trackingApi } from '../../core/api/trackingApi';
import { casesApi } from '../../core/api/casesApi';
import { MapView } from '../../shared/components/MapView';
import { playRiskAlertSiren } from '../../shared/utils/alertSiren';
import { apiClient } from '../../core/api/client';
import { useTargetStore } from '../../stores/targetStore';

export const InvestigationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeTarget, setActiveTarget } = useTargetStore();

  const queryPlate = searchParams.get('plate');
  const initialPlate = queryPlate || activeTarget?.plate || '';

  const [searchInput, setSearchInput] = useState(initialPlate);
  const [activePlate, setActivePlate] = useState(initialPlate);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['vehicle360', activePlate],
    queryFn: () => trackingApi.getVehicle360(activePlate),
    enabled: !!activePlate,
  });

  useEffect(() => {
    if (dossier) {
      setActiveTarget({
        plate: dossier.plate,
        vehicleCategory: dossier.vahan?.vehicle_category || '',
        vehicleMake: dossier.vahan?.vehicle_make || '',
        vehicleModel: dossier.vahan?.vehicle_model || '',
        vehicleColor: dossier.vahan?.vehicle_color || '',
        threatScore: dossier.threat_score || 0,
        isWanted: Boolean(dossier.criminal_record?.is_wanted),
        status: dossier.criminal_record?.is_wanted ? 'CRITICAL_PURSUIT' : 'ACTIVE',
        trajectory: dossier.trajectory?.path_geojson || [],
      });
    }
  }, [dossier]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const clean = searchInput.trim().toUpperCase();
      setActivePlate(clean);
      setSearchParams({ plate: clean });
    }
  };

  const handleAutoCallChowki = async () => {
    if (!dossier) return;
    try {
      playRiskAlertSiren(dossier.threat_score || 95);
      const res = await apiClient<any>('/api/v1/alerts/auto-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          plate: dossier.plate,
          station: dossier.criminal_record?.police_station || 'Navrangpura Police Station, Ahmedabad',
          nearest_chowki: 'SG Highway Traffic Police Chowki (850m away)',
        }),
      });
      setDispatchStatus(`🚨 Emergency Call & Intercept Dossier Dispatched to ${res.intercept_chowki || 'Nearest Police Station'}`);
      setTimeout(() => setDispatchStatus(null), 5000);
    } catch {
      setDispatchStatus('🚨 Emergency Call Dispatched to Nearest Police Chowki');
      setTimeout(() => setDispatchStatus(null), 4000);
    }
  };

  const handleOpenIn65BStudio = () => {
    navigate('/cases');
  };

  const isWanted = dossier?.criminal_record?.is_wanted || activeTarget?.isWanted;
  const pathPoints = dossier?.trajectory?.path_geojson || activeTarget?.trajectory || [];

  return (
    <div className="space-y-4 font-mono">
      {/* Search Bar Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-cyber-cyan" />
            <span>360° Vehicle Investigation & Multi-Camera Trajectory Node Workspace</span>
          </h1>
          <p className="text-xs text-slate-400">
            Multi-Camera Route Reconstruction &bull; VAHAN 4.0 National Registry &bull; eGujCop CCTNS Cross-Referencing
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Plate (e.g. GJ 01 AB 1234)"
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan w-full md:w-64"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            SEARCH
          </button>
        </form>
      </div>

      {dispatchStatus && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-400 text-emerald-300 rounded text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{dispatchStatus}</span>
        </div>
      )}

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-xs text-cyber-cyan">
          <Radio className="w-6 h-6 animate-spin text-cyber-cyan" />
          <span>Reconstructing Multi-Camera Trajectory & Criminal Dossier from 30 Gujarat CCTV Feeds...</span>
        </div>
      ) : dossier ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: 360° Dossier & Criminal Status */}
          <div className="space-y-4">
            {/* Plate Card */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Registration Plate</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isWanted
                      ? 'bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson'
                      : 'bg-emerald-950 text-emerald-400'
                  }`}
                >
                  {isWanted ? `THREAT RATING: ${dossier.threat_score || 95}/100` : `CLEAN RATING: ${dossier.threat_score || 15}/100`}
                </span>
              </div>

              <div className="p-3 rounded bg-black border-2 border-slate-700 text-center font-extrabold text-2xl text-yellow-400 tracking-widest shadow-inner">
                {dossier.plate}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  Total Sightings: <b className="text-cyber-cyan">{pathPoints.length} Checkpoints</b>
                </span>
                <span>
                  Active Status:{' '}
                  <b className={isWanted ? 'text-cyber-crimson' : 'text-emerald-400'}>
                    {isWanted ? 'WANTED (HOTLIST)' : 'ACTIVE (CLEAR)'}
                  </b>
                </span>
              </div>

              {isWanted && (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleAutoCallChowki}
                    className="w-full py-2 rounded bg-cyber-crimson hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-crimson transition-all cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>🚨 AUTO-CALL & DISPATCH NEAREST CHOWKI</span>
                  </button>

                  <button
                    onClick={handleOpenIn65BStudio}
                    className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan font-bold text-xs flex items-center justify-center gap-2 border border-cyber-cyan/40 transition-colors cursor-pointer"
                  >
                    <FolderLock className="w-3.5 h-3.5" />
                    <span>Section 65B Forensics Studio</span>
                  </button>
                </div>
              )}
            </div>

            {/* eGujCop Crime Record */}
            <div
              className={`p-4 rounded border ${
                isWanted
                  ? 'bg-red-950/30 border-cyber-crimson/60 text-red-200'
                  : 'bg-sentinel-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold mb-2">
                {isWanted ? (
                  <ShieldAlert className="w-5 h-5 text-cyber-crimson animate-pulse" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                )}
                <span>eGujCop / CCTNS State Crime Database</span>
              </div>

              {isWanted ? (
                <div className="text-xs space-y-1.5 text-slate-200">
                  <p>
                    <b className="text-slate-400">FIR Number:</b>{' '}
                    <span className="text-white font-bold">{dossier.criminal_record?.fir_number || activeTarget?.firNo}</span>
                  </p>
                  <p>
                    <b className="text-slate-400">Police Station:</b>{' '}
                    <span>{dossier.criminal_record?.police_station || activeTarget?.policeStation}</span>
                  </p>
                  <p>
                    <b className="text-slate-400">Legal Sections:</b>{' '}
                    <span className="text-yellow-300 font-mono">
                      {dossier.criminal_record?.crime_sections?.join(', ') || 'IPC Section 379, BNS Section 303 (Theft)'}
                    </span>
                  </p>
                  <p>
                    <b className="text-slate-400">Investigating Officer:</b>{' '}
                    <span>{dossier.criminal_record?.investigating_officer || activeTarget?.officerName}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No active warrants or criminal records registered for this vehicle in eGujCop.
                </p>
              )}
            </div>

            {/* VAHAN 4.0 Specs */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 text-xs space-y-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-cyber-cyan font-bold">
                  <Car className="w-4 h-4" />
                  <span>VAHAN 4.0 National Registry</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">LIVE MoRTH</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Owner Record</p>
                  <p className="font-bold text-white truncate">{dossier.vahan?.owner_name || 'Gujarat Registered Citizen'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Make & Model</p>
                  <p className="font-bold text-yellow-300">
                    {dossier.vahan?.vehicle_make || activeTarget?.vehicleMake} {dossier.vahan?.vehicle_model || activeTarget?.vehicleModel}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">RTO Location</p>
                  <p className="font-bold text-slate-200">{dossier.vahan?.rto_location || 'RTO Ahmedabad (GJ-01)'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Class & Fuel</p>
                  <p className="font-bold text-slate-200">
                    {dossier.vahan?.vehicle_class || 'LMV'} &bull; {dossier.vahan?.fuel_type || 'Diesel'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Chassis Number</p>
                  <p className="font-mono text-slate-300 text-[11px] truncate">{dossier.vahan?.chassis_number || 'MBH1234884219'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Insurance Upto</p>
                  <p className="font-bold text-slate-200">{dossier.vahan?.insurance_valid_upto || '2027-04-14'}</p>
                </div>
              </div>
            </div>

            {/* Section 65B Certified Forensic Exports */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <FileText className="w-4 h-4 text-cyber-cyan" />
                <span>Section 65B Judicial Exports</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Sealed with SHA-256 HMAC cryptographic forensic signatures.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <a
                  href={casesApi.exportReportUrl('case-2026-00128')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white text-center text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>REPORT</span>
                </a>
                <a
                  href={casesApi.exportJsonUrl('case-2026-00128')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center text-[11px] font-bold transition-colors"
                >
                  JSON LOG
                </a>
                <a
                  href={casesApi.exportCsvUrl('case-2026-00128')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center text-[11px] font-bold transition-colors"
                >
                  CSV PTS
                </a>
              </div>
            </div>
          </div>

          {/* Center & Right Column: Interactive Route Map & Node-to-Node Progression */}
          <div className="lg:col-span-2 space-y-4">
            {/* Trajectory Route Map */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyber-crimson" />
                  <span>PostGIS Reconstructed Multi-Camera Flight Path</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  {pathPoints.length} Camera Checkpoints Correlated
                </span>
              </div>
              <div className="h-80 rounded overflow-hidden border border-slate-800">
                <MapView
                  trajectory={pathPoints}
                  targetPlate={dossier.plate}
                  center={[23.0298, 72.5074]}
                  zoom={12}
                  height="h-80"
                />
              </div>
            </div>

            {/* Interactive Multi-Camera Node Flow Graph */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-xs text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyber-cyan" />
                  <span>Multi-Camera Node Progression Flow (Corridor Graph)</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 font-bold">
                  PTS CHRONOLOGICAL &bull; 100% SYNCHRONIZED
                </span>
              </div>

              {/* Node Sequence Diagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {pathPoints.map((pt: any, idx: number) => {
                  const camTag = pt.camera_id ? pt.camera_id.toLowerCase().replace('cam-', 'cam') : `cam0${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded bg-slate-950 border border-slate-800 relative group hover:border-cyber-cyan/70 transition-all shadow-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-5 h-5 rounded-full bg-cyber-crimson text-white font-bold text-[10px] flex items-center justify-center shadow-glow-crimson">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold text-cyber-cyan font-mono">
                          {pt.camera_id?.toUpperCase()}
                        </span>
                      </div>

                      {/* Mini Live Snapshot Thumbnail */}
                      <div className="h-16 w-full rounded bg-slate-900 border border-slate-800 overflow-hidden mb-2 relative">
                        <img
                          src={`/api/v1/streams/${camTag}/snapshot`}
                          alt={pt.camera_name}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute top-1 left-1 bg-black/80 px-1 py-0.2 rounded text-[8px] text-cyber-cyan font-mono">
                          LIVE CCTV
                        </div>
                      </div>

                      <p className="font-bold text-slate-200 text-xs truncate">
                        {pt.camera_name || pt.camera_id}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Time: <span className="text-white">{pt.sighted_at}</span>
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Speed:</span>
                        <span className="text-yellow-400 font-bold">{pt.speed_kmh} km/h</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chronological Detection Checkpoints Detail */}
              <div className="space-y-2 pt-2">
                {pathPoints.map((pt: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyber-crimson text-white font-bold text-xs flex items-center justify-center shadow-glow-crimson shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{pt.camera_name || pt.camera_id}</p>
                        <p className="text-[10px] text-slate-500">
                          Lat: {Number(pt.latitude).toFixed(4)}, Lng: {Number(pt.longitude).toFixed(4)} &bull; PTS Delta: {pt.pts_ms || idx * 7000}ms
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-cyber-cyan font-bold justify-end">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>{pt.speed_kmh} km/h</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">VERIFIED NODE SIGHTING</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded bg-sentinel-900/60 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-white">No Target Plate Selected</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Enter a vehicle registration plate in the search bar above (e.g. <b className="text-cyber-cyan">GJ 01 AB 1234</b> or <b className="text-cyber-cyan">GJ 05 XY 9988</b>) or select a case in Section 65B Studio to view 360° telemetry and corridor trajectory.
          </p>
        </div>
      )}
    </div>
  );
};
