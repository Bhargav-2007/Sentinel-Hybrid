import React from 'react';
import { ListOrdered, ShieldAlert, PlusCircle, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WatchlistsPage: React.FC = () => {
  const navigate = useNavigate();

  const watchlistItems = [
    {
      plate: 'GJ01AB1234',
      category: 'STOLEN_VEHICLE',
      fir_number: 'FIR-2026-CR-08942',
      station: 'Navrangpura PS, Ahmedabad',
      added_date: '2026-08-30',
      threat_level: 'CRITICAL',
      vehicle_desc: 'Toyota Fortuner 4x4 (White)',
      officer: 'Inspector R.K. Jadeja',
    },
    {
      plate: 'GJ09SS4567',
      category: 'WANTED_SUSPECT_VEHICLE',
      fir_number: 'FIR-2026-CR-07119',
      station: 'Himmatnagar Town PS, Sabarkantha',
      added_date: '2026-08-28',
      threat_level: 'HIGH',
      vehicle_desc: 'Mahindra Scorpio (Black)',
      officer: 'Sub-Inspector V.M. Vaghela',
    },
    {
      plate: 'GJ27TT8842',
      category: 'WRONG_WAY_INTRUSION',
      fir_number: 'FIR-2026-TR-04120',
      station: 'Ellisbridge PS, Ahmedabad',
      added_date: '2026-09-01',
      threat_level: 'MEDIUM',
      vehicle_desc: 'Tata 407 LCV (Yellow)',
      officer: 'Sub-Inspector M.P. Patel',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-crimson/15 border border-cyber-crimson/30 text-cyber-crimson">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-white">
              eGujCop Criminal Watchlists & Hotlist Hot-Sync
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Statewide Stolen Auto Hotlist &bull; Wanted Suspect FIR Registry &bull; Real-time AI Interception
            </p>
          </div>
        </div>

        <button className="px-3.5 py-2 rounded bg-cyber-crimson hover:bg-red-600 text-white font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-glow-crimson">
          <PlusCircle className="w-4 h-4" />
          <span>ADD HOTLIST TARGET</span>
        </button>
      </div>

      {/* Watchlist Cards */}
      <div className="grid gap-3 font-mono text-xs">
        {watchlistItems.map((item) => (
          <div
            key={item.plate}
            className="p-4 rounded bg-sentinel-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-yellow-400 bg-black px-2 py-0.5 rounded border border-slate-700">
                    {item.plate}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-950 text-cyber-crimson border border-cyber-crimson/40">
                    {item.threat_level}
                  </span>
                  <span className="font-bold text-slate-300">{item.category.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-slate-400 text-xs">
                  {item.vehicle_desc} &bull; <b className="text-slate-300">{item.fir_number}</b> ({item.station})
                </p>
                <p className="text-[10px] text-slate-500">
                  Assigned Officer: {item.officer} &bull; Added: {item.added_date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => navigate(`/investigate?plate=${item.plate}`)}
                className="px-3 py-1.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold transition-all flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>TRACE VEHICLE</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
