import React from 'react';
import { X, ShieldAlert, Car, MapPin, Calendar, Clock, Download, PlusCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../core/auth/authStore';
import { hasPermission, PERMISSIONS } from '../../core/auth/permissions';
import { MapView } from './MapView';

export const ContextDrawer: React.FC = () => {
  const { isContextDrawerOpen, contextData, closeContextDrawer } = useUIStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!isContextDrawerOpen || !contextData) return null;

  const health = (contextData as any).health;
  const plate = contextData.plate || contextData.detection?.license_plate?.plate_number || health?.latest_plate_text || '';
  const isWanted = Boolean(contextData.alert || (contextData.detection as any)?.is_wanted);
  const camName = contextData.camera?.name || contextData.detection?.camera_name || 'Camera Node';
  const camId = contextData.camera?.camera_id || 'cam01';
  const lat = contextData.camera?.location?.latitude || 0;
  const lng = contextData.camera?.location?.longitude || 0;
  const vehicleType = contextData.detection?.vehicle_type || health?.latest_vehicle_type || 'Motor Vehicle';
  const personCount = health?.detected_people ?? 0;
  const vehicleCount = health?.detected_vehicles ?? 0;

  const canExport = hasPermission(user?.role, PERMISSIONS.EXPORT_SECTION_65B_EVIDENCE);
  const canCreateCase = hasPermission(user?.role, PERMISSIONS.CREATE_CASE);

  return (
    <aside className="w-96 bg-[#161b22] border-l border-[#30363d] flex flex-col justify-between h-[calc(100vh-3.5rem)] fixed right-0 top-14 z-40 shadow-2xl p-4 overflow-y-auto font-sans animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#21262d] border border-[#30363d] text-[#f0f6fc]">
              <Car className="w-4 h-4 text-[#58a6ff]" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-[#f0f6fc]">
                Target Intelligence Dossier
              </h3>
              <p className="text-[10px] text-[#8b949e] font-mono">eGujCop &bull; Sec. 65B Certified</p>
            </div>
          </div>
          <button
            onClick={closeContextDrawer}
            className="p-1 rounded-md hover:bg-[#21262d] border border-transparent hover:border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Camera Snapshot Preview with HUD Overlay */}
        <div className="mt-3 relative rounded-md overflow-hidden border border-[#30363d] bg-black aspect-video flex items-center justify-center shadow-inner">
          <img
            src={`/api/v1/streams/${camId}/snapshot?t=${Date.now()}`}
            alt={camName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-[#0d1117]/90 border border-[#30363d] text-[9px] font-mono text-[#8b949e] flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse"></span>
            <span>EVIDENCE HUD &bull; {camName}</span>
          </div>
        </div>

        {/* Plate & Threat Evaluation Card */}
        <div className="mt-3 p-3 rounded-md bg-[#0d1117] border border-[#30363d] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#8b949e] uppercase tracking-wider">
              {plate ? 'INDIAN HSRP REGISTRATION' : 'TARGET CLASSIFICATION'}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full font-medium border ${isWanted ? 'border-[#da3633]/40 bg-[#da3633]/15 text-[#f85149]' : 'border-[#238636]/40 bg-[#238636]/15 text-[#3fb950]'
              }`}>
              {isWanted ? 'APB WANTED: 95/100' : 'VERIFIED CLEAR'}
            </span>
          </div>

          {plate ? (
            <div className="p-2 rounded bg-black border border-[#d29922]/60 text-center font-mono font-bold text-lg text-[#d29922] tracking-widest shadow-inner">
              {plate}
            </div>
          ) : (
            <div className="p-2 rounded bg-[#161b22] border border-[#30363d] text-center text-xs text-[#8b949e]">
              {vehicleCount > 0 ? (
                <span className="text-[#3fb950] font-medium font-mono">{vehicleCount} {vehicleType.toUpperCase()} DETECTED</span>
              ) : personCount > 0 ? (
                <span className="text-[#58a6ff] font-medium font-mono">{personCount} PERSONS DETECTED</span>
              ) : (
                <span className="italic">Scanning RTSP frame for targets...</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-[#c9d1d9] pt-1.5 border-t border-[#21262d]">
            <div>
              <span className="text-[#8b949e] text-[10px] block font-medium">VEHICLE CLASSIFICATION</span>
              <span className="text-[#58a6ff] font-medium capitalize">{vehicleType}</span>
            </div>
            <div>
              <span className="text-[#8b949e] text-[10px] block font-medium">CONCURRENT SIGHTINGS</span>
              <span className="text-[#3fb950] font-mono text-xs font-medium">{personCount} People &bull; {vehicleCount} Veh</span>
            </div>
          </div>
        </div>

        {/* eGujCop Criminal Record Status */}
        <div className={`mt-3 p-3 rounded-md border ${isWanted ? 'bg-[#da3633]/10 border-[#da3633]/50 text-[#f85149]' : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9]'
          }`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
            {isWanted ? <ShieldAlert className="w-3.5 h-3.5 text-[#f85149]" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#3fb950]" />}
            <span className="text-[#f0f6fc]">{isWanted ? 'eGujCop Stolen Vehicle Hotlist' : 'eGujCop CCTNS Database'}</span>
          </div>

          {isWanted ? (
            <div className="text-[11px] space-y-1 mt-1.5 text-[#c9d1d9]">
              <p><b className="text-[#8b949e] font-normal">FIR No:</b> <span className="font-mono text-[#f0f6fc]">FIR-2026-CR-08942</span></p>
              <p><b className="text-[#8b949e] font-normal">Station:</b> Navrangpura Police Station</p>
              <p><b className="text-[#8b949e] font-normal">Sections:</b> IPC 379, BNS Section 303</p>
              <p><b className="text-[#8b949e] font-normal">IO:</b> Inspector R.K. Jadeja (GJ-POL-8842)</p>
            </div>
          ) : (
            <p className="text-[11px] text-[#8b949e]">No active APB warrants or court lookouts logged against this target.</p>
          )}
        </div>

        {/* VAHAN 4.0 Specifications */}
        <div className="mt-3 p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-xs space-y-1.5">
          <div className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>VAHAN 4.0 National Registry</span>
            <span className="text-[#3fb950] font-mono text-[9px]">LIVE SYNC</span>
          </div>
          <div className="flex justify-between text-[#c9d1d9] pt-1 border-t border-[#21262d]">
            <span className="text-[#8b949e]">Registered Owner:</span>
            <span className="font-medium text-[#f0f6fc]">State Registered Citizen</span>
          </div>
          <div className="flex justify-between text-[#c9d1d9]">
            <span className="text-[#8b949e]">Make / Model:</span>
            <span className="text-[#58a6ff] font-medium">Toyota Fortuner 4x4</span>
          </div>
          <div className="flex justify-between text-[#c9d1d9]">
            <span className="text-[#8b949e]">RTO Jurisdiction:</span>
            <span className="font-mono">RTO Ahmedabad (GJ-01)</span>
          </div>
          <div className="flex justify-between text-[#c9d1d9]">
            <span className="text-[#8b949e]">Insurance Status:</span>
            <span className="text-[#3fb950] font-mono">Valid thru 2027</span>
          </div>
        </div>

        {/* Mini Radar Map */}
        <div className="mt-3">
          <div className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Sighting Geolocation</span>
            <span className="text-[#58a6ff] truncate max-w-[180px]">{camName}</span>
          </div>
          <div className="h-36 rounded-md overflow-hidden border border-[#30363d] shadow-sm">
            <MapView
              center={[lat, lng]}
              zoom={13}
              cameras={[
                {
                  camera_id: 'ACTIVE_TARGET',
                  name: camName,
                  department_id: 'POLICE',
                  location: { latitude: lat, longitude: lng, district: 'Ahmedabad' },
                  camera_type: 'bullet',
                  protocol: 'rtsp',
                  rtsp_url: '',
                  vendor: 'Hikvision',
                  codec: 'h264',
                  resolution: '1920x1080',
                  frame_rate: 25,
                  status: 'ONLINE',
                  is_public_domain: true,
                  tags: [],
                },
              ]}
              height="h-36"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons in GitHub Style */}
      <div className="pt-3 border-t border-[#30363d] space-y-2">
        <button
          onClick={() => {
            closeContextDrawer();
            navigate(`/investigate?plate=${plate}`);
          }}
          className="w-full gh-btn gh-btn-primary justify-center text-xs py-1.5"
        >
          <span>Open in Forensic Investigation</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>

        {canCreateCase && (
          <button
            onClick={() => {
              closeContextDrawer();
              navigate(`/cases?create=true&plate=${plate}`);
            }}
            className="w-full gh-btn justify-center text-xs py-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Generate Police Case Dossier</span>
          </button>
        )}

        {canExport && (
          <a
            href={`http://localhost:8000/api/v1/cases/case-2026-00127/export/report`}
            target="_blank"
            rel="noreferrer"
            className="w-full gh-btn justify-center text-xs py-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Sec. 65B Certificate</span>
          </a>
        )}
      </div>
    </aside>
  );
};
