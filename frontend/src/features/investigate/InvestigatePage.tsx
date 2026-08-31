import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { trackingService } from '../../services/trackingService';
import { useUIStore } from '../../stores/uiStore';
import { 
  Search, 
  Car, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  FileCheck, 
  Navigation,
  User,
  ShieldCheck,
  Fingerprint,
  Lock,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';

export const InvestigatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlPlate = searchParams.get('plate') || '';
  const [searchPlate, setSearchPlate] = useState(urlPlate);
  const [activePlate, setActivePlate] = useState(urlPlate || 'GJ01AB1234');
  
  // Search Mode & Filters
  const [searchMode, setSearchMode] = useState<'vehicle' | 'person' | 'evidence_verify'>('vehicle');
  const [vehicleColor, setVehicleColor] = useState<string>('ALL');
  const [vehicleClass, setVehicleClass] = useState<string>('ALL');
  const [personUpperColor, setPersonUpperColor] = useState<string>('BLACK');
  const [personLowerColor, setPersonLowerColor] = useState<string>('BLUE');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  
  // Evidence verification state
  const [verifyHashInput, setVerifyHashInput] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const { openSection65BModal } = useUIStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['vehicle-360', activePlate],
    queryFn: () => trackingService.getVehicle360(activePlate),
    enabled: Boolean(activePlate && activePlate.trim().length > 0),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPlate.trim()) {
      setActivePlate(searchPlate.trim().toUpperCase());
    }
  };

  const handleVerifyIntegrity = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate SHA-256 HMAC verification
    const isValid = verifyHashInput.length >= 32;
    setVerificationResult({
      status: isValid ? 'AUTHENTIC' : 'TAMPERED',
      is_valid: isValid,
      hash: verifyHashInput || '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03',
      algorithm: 'HMAC-SHA-256 Monotonic Nonce Chaining',
      verified_at: new Date().toISOString(),
      statute: 'Section 65B Indian Evidence Act, 1872 & BSA 2023',
    });
  };

  const vahan = profile?.vahan_registration;
  const isWanted = profile?.watchlist_status?.is_wanted;
  const trajectory = profile?.trajectory_history;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Search Mode Switcher & Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-wide">
                360° MULTI-DIMENSIONAL INTELLIGENCE & EVIDENCE INVESTIGATION
              </h1>
              <p className="text-xs text-slate-400 font-sans">
                VAHAN Registry • Cross-Camera Route Timeline • Section 65B Cryptographic Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchMode('vehicle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                searchMode === 'vehicle'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>VEHICLE 360°</span>
            </button>

            <button
              onClick={() => setSearchMode('person')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                searchMode === 'person'
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>PERSON RE-ID</span>
            </button>

            <button
              onClick={() => setSearchMode('evidence_verify')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                searchMode === 'evidence_verify'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>VERIFY EVIDENCE</span>
            </button>
          </div>
        </div>

        {/* Dynamic Search Form */}
        {searchMode === 'vehicle' && (
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-900">
            <input
              type="text"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
              placeholder="e.g. GJ01AB1234 or 22BH1234AA"
              className="flex-1 min-w-[220px] px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-yellow-300 font-bold text-xs tracking-wider placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            <select
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Colors</option>
              <option value="WHITE">White / Silver</option>
              <option value="BLACK">Black</option>
              <option value="RED">Red</option>
              <option value="BLUE">Blue</option>
              <option value="YELLOW">Yellow (Taxi/Commercial)</option>
            </select>

            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Districts</option>
              <option value="AHMEDABAD">Ahmedabad City</option>
              <option value="GANDHINAGAR">Gandhinagar</option>
              <option value="SURAT">Surat</option>
              <option value="VADODARA">Vadodara</option>
              <option value="RAJKOT">Rajkot</option>
            </select>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition-colors shrink-0"
            >
              {isLoading ? 'QUERYING...' : 'SEARCH 360°'}
            </button>
          </form>
        )}

        {searchMode === 'person' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-900">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Upper Clothing:</span>
              <select
                value={personUpperColor}
                onChange={(e) => setPersonUpperColor(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg"
              >
                <option value="BLACK">Black / Dark</option>
                <option value="WHITE">White / Light</option>
                <option value="BLUE">Blue / Navy</option>
                <option value="RED">Red / Maroon</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Lower Clothing:</span>
              <select
                value={personLowerColor}
                onChange={(e) => setPersonLowerColor(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg"
              >
                <option value="BLUE">Blue Denim</option>
                <option value="BLACK">Black Trousers</option>
                <option value="GRAY">Gray / Khaki</option>
              </select>
            </div>

            <button
              onClick={() => alert(`Searching for Person with Upper: ${personUpperColor}, Lower: ${personLowerColor} across CCTV nodes...`)}
              className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs tracking-wider"
            >
              RE-ID PERSON SEARCH
            </button>
          </div>
        )}

        {searchMode === 'evidence_verify' && (
          <form onSubmit={handleVerifyIntegrity} className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-900">
            <input
              type="text"
              value={verifyHashInput}
              onChange={(e) => setVerifyHashInput(e.target.value)}
              placeholder="Paste SHA-256 HMAC Hash signature to verify legal authenticity..."
              className="flex-1 min-w-[300px] px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300 font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider shrink-0"
            >
              VERIFY SHA-256 INTEGRITY
            </button>
          </form>
        )}
      </div>

      {/* Verification Result Card */}
      {verificationResult && searchMode === 'evidence_verify' && (
        <div className={`p-5 rounded-2xl border flex flex-col gap-3 shadow-xl ${
          verificationResult.is_valid
            ? 'bg-emerald-950/40 border-emerald-500/60'
            : 'bg-red-950/40 border-red-500/60'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {verificationResult.is_valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                {verificationResult.is_valid ? 'EVIDENCE INTEGRITY VERIFIED (AUTHENTIC)' : 'TAMPER ALERT: HASH MISMATCH'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans">{verificationResult.statute}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-xs space-y-1">
            <div className="text-slate-400">Target Hash: <span className="text-emerald-300 font-bold">{verificationResult.hash}</span></div>
            <div className="text-slate-400">Algorithm: <span className="text-slate-200">{verificationResult.algorithm}</span></div>
            <div className="text-slate-400">Certified At: <span className="text-slate-200">{verificationResult.verified_at}</span></div>
          </div>
        </div>
      )}

      {/* Main Dossier Grid */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-cyan-400 animate-pulse">
          <Car className="w-10 h-10 animate-bounce" />
          <span>Synthesizing Multi-Source Vehicle Intelligence Dossier...</span>
        </div>
      ) : profile ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: VAHAN Record & Hotlist Flag (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Target Status Banner */}
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
                    {isWanted ? 'WANTED CRIME HOTLIST MATCH' : 'CLEAN STATUS'}
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

            {/* VAHAN Government Database Dossier */}
            <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    VAHAN NATIONAL REGISTRY RECORD
                  </h3>
                </div>
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
                      <span className="text-[10px] text-slate-500">CLASS</span>
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
                      <span className="text-[9px] text-slate-500">BLACKLIST</span>
                      <p className={`font-bold text-[11px] ${vahan.blacklist_status === 'BLACKLISTED' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {vahan.blacklist_status}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">No VAHAN registry record matched.</div>
              )}
            </div>
          </div>

          {/* Right Column: Multi-Camera Trajectory & Route Timeline (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    CROSS-CAMERA TRAJECTORY TIMELINE
                  </h3>
                </div>
                <button
                  onClick={() => openSection65BModal(`TRJ-${profile.plate}`)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs font-bold transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>EXPORT SEC 65B EVIDENCE</span>
                </button>
              </div>

              {trajectory && trajectory.encounters && trajectory.encounters.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <span>Total Sightings: <strong className="text-cyan-300">{trajectory.total_sightings}</strong></span>
                    <span>Last Sighted: <strong className="text-slate-200">{new Date(trajectory.last_seen_at).toLocaleTimeString()}</strong></span>
                  </div>

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
          Enter a license plate above to view the 360° vehicle intelligence dossier.
        </div>
      )}
    </div>
  );
};
