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

  const plate = contextData.plate || contextData.detection?.license_plate?.plate_number || '';
  const isWanted = Boolean(contextData.alert || (contextData.detection as any)?.is_wanted);
  const camName = contextData.camera?.name || contextData.detection?.camera_name || 'Camera Node';
  const lat = contextData.camera?.location?.latitude || 0;
  const lng = contextData.camera?.location?.longitude || 0;

  const canExport = hasPermission(user?.role, PERMISSIONS.EXPORT_SECTION_65B_EVIDENCE);
  const canCreateCase = hasPermission(user?.role, PERMISSIONS.CREATE_CASE);

  return (
    <aside className="w-96 bg-sentinel-900/98 backdrop-blur border-l border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] fixed right-0 top-16 z-40 shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-cyber-cyan" />
            <h3 className="font-mono font-bold text-sm text-white">Target Context Panel</h3>
          </div>
          <button
            onClick={closeContextDrawer}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plate & Criminal Threat Badge */}
        <div className="mt-4 p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400">DETECTED LICENSE PLATE</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              isWanted ? 'bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson' : 'bg-emerald-950 text-emerald-400'
            }`}>
              {isWanted ? 'THREAT SCORE: 95/100' : 'CLEAN: 15/100'}
            </span>
          </div>

          <div className="p-2 rounded bg-black border-2 border-slate-700 text-center font-mono font-extrabold text-xl text-yellow-400 tracking-widest shadow-inner">
            {plate}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
            <span>OCR Confidence: <b className="text-emerald-400">98.4%</b></span>
            <span>Type: <b className="text-cyber-cyan">Car (SUV)</b></span>
          </div>
        </div>

        {/* eGujCop Criminal Record Status */}
        <div className={`mt-3 p-3 rounded border ${
          isWanted ? 'bg-red-950/40 border-cyber-crimson/60 text-red-200' : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-2 font-mono text-xs font-bold mb-1">
            {isWanted ? <ShieldAlert className="w-4 h-4 text-cyber-crimson" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            <span>{isWanted ? 'eGujCop Stolen Vehicle Hotlist' : 'eGujCop CCTNS Record'}</span>
          </div>

          {isWanted ? (
            <div className="text-[11px] font-mono space-y-1 mt-2 text-slate-300">
              <p><b className="text-slate-400">FIR No:</b> FIR-2026-CR-08942</p>
              <p><b className="text-slate-400">Station:</b> Navrangpura Police Station</p>
              <p><b className="text-slate-400">Sections:</b> IPC 379, BNS Section 303 (Theft)</p>
              <p><b className="text-slate-400">Investigator:</b> Inspector R.K. Jadeja (Badge GJ-POL-8842)</p>
            </div>
          ) : (
            <p className="text-[11px] font-mono text-slate-400">No active warrants or FIR records found for this plate.</p>
          )}
        </div>

        {/* VAHAN 4.0 Specifications */}
        <div className="mt-3 p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            VAHAN 4.0 National Registry
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Owner:</span>
            <span>State Registered Citizen</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Make / Model:</span>
            <span className="text-cyber-cyan">Toyota Fortuner 4x4</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">RTO Location:</span>
            <span>RTO Ahmedabad (GJ-01)</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Insurance:</span>
            <span className="text-emerald-400">Valid upto 2027</span>
          </div>
        </div>

        {/* Mini Radar Map */}
        <div className="mt-3">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Sighting Location</span>
            <span className="text-cyber-cyan">{camName}</span>
          </div>
          <div className="h-36 rounded overflow-hidden border border-slate-800">
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

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        <button
          onClick={() => {
            closeContextDrawer();
            navigate(`/investigate?plate=${plate}`);
          }}
          className="w-full py-2 px-3 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <span>Track in Investigation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {canCreateCase && (
          <button
            onClick={() => {
              closeContextDrawer();
              navigate(`/cases?create=true&plate=${plate}`);
            }}
            className="w-full py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Police Case Dossier</span>
          </button>
        )}

        {canExport && (
          <a
            href={`http://localhost:8000/api/v1/cases/case-2026-00127/export/report`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 px-3 rounded bg-slate-900 hover:bg-slate-800 text-cyber-cyan font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-cyber-cyan/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Section 65B Certificate</span>
          </a>
        )}
      </div>
    </aside>
  );
};
