import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trackingService } from '../../services/trackingService';
import { useUIStore } from '../../stores/uiStore';
import { 
  Car, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  FileCheck, 
  Navigation,
  ArrowRight,
  Briefcase
} from 'lucide-react';

export const VehicleSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { openSection65BModal } = useUIStore();

  const [plateInput, setPlateInput] = useState('GJ01AB1234');
  const [searchedPlate, setSearchedPlate] = useState('GJ01AB1234');
  const [vehicleMake, setVehicleMake] = useState('ALL');
  const [vehicleColor, setVehicleColor] = useState('ALL');
  const [district, setDistrict] = useState('ALL');
  const [timeRange, setTimeRange] = useState('24h');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['vehicle-search', searchedPlate],
    queryFn: () => trackingService.getVehicle360(searchedPlate),
    enabled: Boolean(searchedPlate && searchedPlate.trim().length > 0),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (plateInput.trim()) {
      setSearchedPlate(plateInput.trim().toUpperCase());
    }
  };

  const vahan = profile?.vahan_registration;
  const isWanted = profile?.watchlist_status?.is_wanted;
  const trajectory = profile?.trajectory_history;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Search Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              STATEWIDE HISTORICAL VEHICLE & ANPR SEARCH
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              Search by Registration Plate, Make, Model, Color, District, and Sighting Corridor
            </p>
          </div>
        </div>

        {/* Multi-Parameter Search Bar */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-900 text-xs">
          {/* Plate Number */}
          <div className="lg:col-span-2">
            <label className="text-[10px] text-slate-400">VEHICLE PLATE / REGISTRATION</label>
            <input
              type="text"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              placeholder="e.g. GJ01AB1234 or 22BH1234AA"
              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-yellow-300 font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Vehicle Color */}
          <div>
            <label className="text-[10px] text-slate-400">COLOR</label>
            <select
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Colors</option>
              <option value="WHITE">White / Silver</option>
              <option value="BLACK">Black</option>
              <option value="RED">Red</option>
              <option value="BLUE">Blue</option>
              <option value="YELLOW">Yellow</option>
            </select>
          </div>

          {/* District */}
          <div>
            <label className="text-[10px] text-slate-400">DISTRICT</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Districts</option>
              <option value="AHMEDABAD">Ahmedabad City</option>
              <option value="GANDHINAGAR">Gandhinagar</option>
              <option value="SURAT">Surat</option>
              <option value="VADODARA">Vadodara</option>
              <option value="RAJKOT">Rajkot</option>
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="text-[10px] text-slate-400">TIME WINDOW</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-colors"
            >
              {isLoading ? 'QUERYING...' : 'QUERY ANPR'}
            </button>
          </div>
        </form>
      </div>

      {/* Main Results Area */}
      {isLoading ? (
        <div className="py-16 text-center text-cyan-400 animate-pulse flex flex-col items-center justify-center gap-3">
          <Car className="w-10 h-10 animate-bounce" />
          <span>Searching 140,000+ statewide ANPR vehicle records...</span>
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: VAHAN Record & Hotlist Flag (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg ${
                isWanted
                  ? 'bg-red-950/40 border-red-500/60 text-red-300'
                  : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {isWanted ? (
                  <ShieldAlert className="w-7 h-7 text-red-400 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                )}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isWanted ? 'WANTED CRIME HOTLIST MATCH' : 'CLEAN VEHICLE RECORD'}
                  </span>
                  <p className="text-[10px] text-slate-300 font-sans mt-0.5">
                    {isWanted ? 'Target flagged in eGujCop crime registry.' : 'No active warrants or FIRs.'}
                  </p>
                </div>
              </div>
              <span className="text-base font-bold font-mono text-yellow-300 bg-black/60 px-2.5 py-1 rounded border border-yellow-500/40">
                {profile.plate}
              </span>
            </div>

            {/* VAHAN Government Dossier */}
            <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">VAHAN 4.0 REGISTRATION</span>
                <span className="text-[10px] text-slate-400">RTO GUJARAT</span>
              </div>

              {vahan ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <div>
                      <span className="text-[10px] text-slate-500">OWNER NAME</span>
                      <p className="text-slate-200 font-bold">{vahan.owner_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">VEHICLE CLASS</span>
                      <p className="text-slate-200 font-bold">{vahan.vehicle_class}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <div>
                      <span className="text-[10px] text-slate-500">CHASSIS NUMBER</span>
                      <p className="text-slate-300 font-mono">{vahan.chassis_number}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">ENGINE NUMBER</span>
                      <p className="text-slate-300 font-mono">{vahan.engine_number}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
                    <div>
                      <span className="text-[9px] text-slate-500">INSURANCE</span>
                      <p className="text-emerald-400 font-bold text-[11px]">{vahan.insurance_valid_upto}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500">FITNESS</span>
                      <p className="text-emerald-400 font-bold text-[11px]">{vahan.fitness_valid_upto}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500">STATUS</span>
                      <p className="text-emerald-400 font-bold text-[11px]">{vahan.blacklist_status}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">No VAHAN registry record matched.</div>
              )}
            </div>
          </div>

          {/* Right Column: Multi-Camera Trajectory & Action Buttons (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    SIGHTINGS TIMELINE ({trajectory?.total_sightings || 0} ENCOUNTERS)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSection65BModal(`TRJ-${profile.plate}`)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs font-bold transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>SEC 65B</span>
                  </button>

                  <button
                    onClick={() => navigate('/cases')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-xs font-bold transition-colors"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>OPEN CASE</span>
                  </button>
                </div>
              </div>

              {trajectory && trajectory.encounters && trajectory.encounters.length > 0 ? (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {trajectory.encounters.map((enc: any, idx: number) => (
                    <div
                      key={enc.id || idx}
                      className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-200">{enc.camera_name || `Camera #${enc.camera_id}`}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                            Lat: {enc.latitude}, Lng: {enc.longitude} • PTS: {enc.pts_timestamp_ms}ms
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-cyan-400 text-xs font-bold">
                          {enc.speed_kmh ? `${enc.speed_kmh} km/h` : 'CORRIDOR SYNC'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(enc.sighted_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No movement trajectory encounters recorded for {profile.plate}.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 text-xs">
          Enter a license plate above to view the vehicle intelligence dossier.
        </div>
      )}
    </div>
  );
};
