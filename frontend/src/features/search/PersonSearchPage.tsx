import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UserSearch, 
  User, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Camera, 
  ShieldCheck, 
  Fingerprint,
  Layers,
  ArrowRight
} from 'lucide-react';

interface PersonSightingResult {
  id: string;
  camera_id: string;
  camera_name: string;
  district: string;
  timestamp: string;
  upper_color: string;
  lower_color: string;
  confidence: number;
  snapshot_url: string;
  walking_speed_kmh?: number;
  latitude: number;
  longitude: number;
}

export const PersonSearchPage: React.FC = () => {
  const [upperColor, setUpperColor] = useState('BLACK');
  const [lowerColor, setLowerColor] = useState('BLUE');
  const [district, setDistrict] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [timeWindow, setTimeWindow] = useState('24h');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  // Mock initial search results
  const [results, setResults] = useState<PersonSightingResult[]>([
    {
      id: 'sighting-p-01',
      camera_id: '1',
      camera_name: 'SG Highway — Prahladnagar Junction',
      district: 'Ahmedabad City',
      timestamp: '2026-08-31T06:14:20Z',
      upper_color: 'Black Jacket',
      lower_color: 'Blue Denim',
      confidence: 0.94,
      snapshot_url: '/snapshots/pedestrian_01.jpg',
      walking_speed_kmh: 4.8,
      latitude: 23.0125,
      longitude: 72.5085,
    },
    {
      id: 'sighting-p-02',
      camera_id: '3',
      camera_name: 'SG Highway — ISKCON Crossroad Footbridge',
      district: 'Ahmedabad City',
      timestamp: '2026-08-31T06:22:15Z',
      upper_color: 'Black Jacket',
      lower_color: 'Blue Denim',
      confidence: 0.91,
      snapshot_url: '/snapshots/pedestrian_02.jpg',
      walking_speed_kmh: 5.1,
      latitude: 23.0245,
      longitude: 72.5180,
    },
    {
      id: 'sighting-p-03',
      camera_id: '5',
      camera_name: 'SG Highway — Thaltej Metro Station Entry',
      district: 'Ahmedabad City',
      timestamp: '2026-08-31T06:31:00Z',
      upper_color: 'Black Jacket',
      lower_color: 'Blue Denim',
      confidence: 0.88,
      snapshot_url: '/snapshots/pedestrian_03.jpg',
      walking_speed_kmh: 4.5,
      latitude: 23.0550,
      longitude: 72.5290,
    },
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setTimeout(() => {
      setSearching(false);
      setHasSearched(true);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Header */}
      <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
            <UserSearch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              PERSON APPEARANCE & CLOTHING RE-ID SEARCH
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              HSV Color Segmentation • Upper/Lower Clothing Matching • Multi-Camera Spatial Trajectory
            </p>
          </div>
        </div>

        {/* Search Parameters Form */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-900 text-xs">
          {/* Upper Clothing */}
          <div>
            <label className="text-[10px] text-slate-400">UPPER CLOTHING COLOR</label>
            <select
              value={upperColor}
              onChange={(e) => setUpperColor(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-400"
            >
              <option value="BLACK">Black / Dark Navy</option>
              <option value="WHITE">White / Cream</option>
              <option value="RED">Red / Maroon</option>
              <option value="BLUE">Blue / Denim</option>
              <option value="YELLOW">Yellow / Orange</option>
              <option value="GREEN">Green / Olive</option>
            </select>
          </div>

          {/* Lower Clothing */}
          <div>
            <label className="text-[10px] text-slate-400">LOWER CLOTHING COLOR</label>
            <select
              value={lowerColor}
              onChange={(e) => setLowerColor(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-400"
            >
              <option value="BLUE">Blue Denim / Jeans</option>
              <option value="BLACK">Black Trousers</option>
              <option value="GRAY">Gray / Khaki</option>
              <option value="WHITE">White Pants</option>
              <option value="BROWN">Brown / Beige</option>
            </select>
          </div>

          {/* District */}
          <div>
            <label className="text-[10px] text-slate-400">DISTRICT CORRIDOR</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-400"
            >
              <option value="ALL">All Gujarat Districts</option>
              <option value="AHMEDABAD">Ahmedabad City</option>
              <option value="GANDHINAGAR">Gandhinagar</option>
              <option value="SURAT">Surat</option>
              <option value="VADODARA">Vadodara</option>
            </select>
          </div>

          {/* Time Window */}
          <div>
            <label className="text-[10px] text-slate-400">TIME WINDOW</label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-400"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={searching}
              className="w-full py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs tracking-wider transition-colors shadow-md shadow-purple-500/20"
            >
              {searching ? 'MATCHING RE-ID...' : 'RUN RE-ID SEARCH'}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              CORRELATED SIGHTINGS ({results.length} NODES MATCHED)
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">HSV Color Match Confidence Threshold: &gt; 85%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((r, idx) => (
            <div
              key={r.id}
              className="bg-[#080d1a] border border-slate-800 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-lg hover:border-purple-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-300 font-bold flex items-center justify-center text-xs">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-200">{r.camera_name}</span>
                </div>
                <span className="text-[10px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                  {(r.confidence * 100).toFixed(0)}% MATCH
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-900 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-500">UPPER WEAR</span>
                  <p className="text-slate-200 font-bold">{r.upper_color}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500">LOWER WEAR</span>
                  <p className="text-slate-200 font-bold">{r.lower_color}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500">SPEED VECTOR</span>
                  <p className="text-cyan-400 font-bold">{r.walking_speed_kmh} km/h</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500">SIGHTED AT</span>
                  <p className="text-slate-300">{new Date(r.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                <span className="text-[10px] text-slate-400 truncate">{r.district}</span>
                <button
                  onClick={() => alert(`Locking Re-ID trajectory on node ${r.camera_id}...`)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-purple-500 hover:text-slate-950 text-slate-300 text-[10px] font-bold border border-slate-800 transition-colors"
                >
                  TRACK CORRIDOR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
