import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldAlert, Car, MapPin, Download, CheckCircle, FileText, Clock, Gauge } from 'lucide-react';
import { trackingApi } from '../../core/api/trackingApi';
import { casesApi } from '../../core/api/casesApi';
import { MapView } from '../../shared/components/MapView';

export const InvestigationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPlate = searchParams.get('plate') || 'GJ01AB1234';
  const [searchInput, setSearchInput] = useState(initialPlate);
  const [activePlate, setActivePlate] = useState(initialPlate);

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['vehicle360', activePlate],
    queryFn: () => trackingApi.getVehicle360(activePlate),
    enabled: !!activePlate,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActivePlate(searchInput.trim().toUpperCase());
      setSearchParams({ plate: searchInput.trim().toUpperCase() });
    }
  };

  const isWanted = dossier?.criminal_record?.is_wanted;

  return (
    <div className="space-y-4">
      {/* Search Bar Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold font-mono text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-cyber-cyan" />
            360° Vehicle Investigation & Trajectory Workspace
          </h1>
          <p className="text-xs font-mono text-slate-400">
            Multi-Camera Route Reconstruction &bull; VAHAN Registry &bull; eGujCop CCTNS Cross-Referencing
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search Plate (e.g. GJ01AB1234)"
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan w-full md:w-64"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-mono text-xs font-bold transition-all shadow-md"
          >
            SEARCH
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center font-mono text-xs text-cyber-cyan">
          Reconstructing Multi-Camera Trajectory & Criminal Dossier...
        </div>
      ) : dossier ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: 360° Dossier & Criminal Status */}
          <div className="space-y-4">
            {/* Plate Card */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Registration Plate</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isWanted ? 'bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson' : 'bg-emerald-950 text-emerald-400'
                }`}>
                  {isWanted ? 'THREAT RATING: 95/100' : 'CLEAN RATING: 15/100'}
                </span>
              </div>

              <div className="p-3 rounded bg-black border-2 border-slate-700 text-center font-mono font-extrabold text-2xl text-yellow-400 tracking-widest shadow-inner">
                {dossier.plate}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>Total Sightings: <b className="text-cyber-cyan">{dossier.trajectory.total_sightings}</b></span>
                <span>Active Status: <b className={isWanted ? 'text-cyber-crimson' : 'text-emerald-400'}>{isWanted ? 'WANTED (STOLEN)' : 'ACTIVE'}</b></span>
              </div>
            </div>

            {/* eGujCop Crime Record */}
            <div className={`p-4 rounded border ${
              isWanted ? 'bg-red-950/30 border-cyber-crimson/60 text-red-200' : 'bg-sentinel-900 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center gap-2 font-mono text-xs font-bold mb-2">
                {isWanted ? <ShieldAlert className="w-5 h-5 text-cyber-crimson" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
                <span>eGujCop / CCTNS State Crime Database</span>
              </div>

              {isWanted ? (
                <div className="text-xs font-mono space-y-1.5 text-slate-200">
                  <p><b className="text-slate-400">FIR Number:</b> {dossier.criminal_record.fir_number}</p>
                  <p><b className="text-slate-400">Police Station:</b> {dossier.criminal_record.police_station}</p>
                  <p><b className="text-slate-400">Legal Sections:</b> {dossier.criminal_record.crime_sections?.join(', ')}</p>
                  <p><b className="text-slate-400">Investigating Officer:</b> {dossier.criminal_record.investigating_officer}</p>
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-400">No active warrants or criminal records registered for this vehicle.</p>
              )}
            </div>

            {/* VAHAN 4.0 Specs */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-cyber-cyan font-bold pb-2 border-b border-slate-800">
                <Car className="w-4 h-4" />
                <span>VAHAN 4.0 National Registry Specifications</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <p className="text-[10px] text-slate-500">Owner</p>
                  <p className="font-semibold">{dossier.vahan.owner_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Make / Model</p>
                  <p className="font-semibold text-cyber-cyan">{dossier.vahan.vehicle_make} {dossier.vahan.vehicle_model}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">RTO Jurisdiction</p>
                  <p className="font-semibold">{dossier.vahan.rto_location}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Fuel Type</p>
                  <p className="font-semibold">{dossier.vahan.fuel_type}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Insurance Valid</p>
                  <p className="font-semibold text-emerald-400">{dossier.vahan.insurance_valid_upto}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">PUC Valid</p>
                  <p className="font-semibold">{dossier.vahan.puc_valid_upto}</p>
                </div>
              </div>
            </div>

            {/* Section 65B Certified Forensic Export Suite */}
            <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                <FileText className="w-4 h-4 text-cyber-cyan" />
                <span>Section 65B Certified Judicial Exports</span>
              </div>
              <p className="text-[11px] font-mono text-slate-500">
                Tamper-evident forensic packages sealed with SHA-256 HMAC cryptographic signatures.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <a
                  href={casesApi.exportReportUrl('case-2026-00127')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white text-center font-mono text-[11px] font-bold transition-all"
                >
                  HTML REPORT
                </a>
                <a
                  href={casesApi.exportJsonUrl('case-2026-00127')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-mono text-[11px] font-bold transition-colors"
                >
                  JSON SIDE-CAR
                </a>
                <a
                  href={casesApi.exportCsvUrl('case-2026-00127')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-mono text-[11px] font-bold transition-colors"
                >
                  CSV LOGS
                </a>
              </div>
            </div>
          </div>

          {/* Center & Right Column: Interactive Route Map & Sightings Timeline */}
          <div className="lg:col-span-2 space-y-4">
            {/* Trajectory Route Map */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-mono font-bold text-xs text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyber-crimson" />
                  PostGIS Reconstructed Multi-Camera Flight Path
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  4 Camera Checkpoints Correlated
                </span>
              </div>
              <div className="h-80 rounded overflow-hidden">
                <MapView
                  trajectory={dossier.trajectory.path_geojson}
                  center={[23.0298, 72.5074]}
                  zoom={12}
                  height="h-80"
                />
              </div>
            </div>

            {/* Sightings Timeline */}
            <div className="p-4 rounded bg-sentinel-900 border border-slate-800 space-y-3">
              <h3 className="font-mono font-bold text-xs text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyber-cyan" />
                Chronological Detection Checkpoints (PTS Monotonic Delta Timing)
              </h3>

              <div className="space-y-2">
                {dossier.trajectory.path_geojson.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyber-crimson text-white font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{pt.camera_name || pt.camera_id}</p>
                        <p className="text-[10px] text-slate-500">
                          Lat: {pt.latitude.toFixed(4)}, Lng: {pt.longitude.toFixed(4)} &bull; Time: {pt.sighted_at}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-cyber-cyan font-bold">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>{pt.speed_kmh} km/h</span>
                      </div>
                      <span className="text-[10px] text-emerald-400">CONFIRMED SIGHTING</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
