import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistService } from '../../services/watchlistService';
import { WatchlistEntry } from '../../shared/types';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { 
  ListFilter, 
  Plus, 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  Car, 
  UserX, 
  HelpCircle, 
  Ban,
  FileCheck
} from 'lucide-react';

export const WatchlistIntelligencePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { openVehicleDrawer } = useContextDrawerStore();
  const [testPlate, setTestPlate] = useState('GJ01AB1234');
  const [testResult, setTestResult] = useState<any>(null);

  const { data: watchlists = [] } = useQuery({
    queryKey: ['watchlists'],
    queryFn: () => watchlistService.listWatchlists(),
  });

  const categories = [
    { label: 'STOLEN VEHICLES', count: 182, icon: Car, color: 'text-red-400', bg: 'bg-red-950/40 border-red-500/50' },
    { label: 'WANTED PERSONS', count: 74, icon: UserX, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/50' },
    { label: 'MISSING PERSONS', count: 31, icon: HelpCircle, color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-500/50' },
    { label: 'BLACKLISTED PLATES', count: 93, icon: Ban, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-500/50' },
  ];

  const handleTestCheck = async () => {
    try {
      const res = await watchlistService.checkPlate(testPlate.trim().toUpperCase());
      setTestResult(res);
    } catch (e: any) {
      alert(`Check error: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Banner: Watchlist Category Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-cyan-400" />
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              WATCHLIST INTELLIGENCE & CRIME REGISTRIES
            </h1>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">eGujCop & VAHAN Cross-Correlation</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div key={idx} className={`p-4 rounded-2xl border ${cat.bg} flex items-center justify-between shadow-lg`}>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{cat.label}</span>
                  <div className="text-2xl font-bold text-slate-100 mt-1">{cat.count}</div>
                  <span className={`text-[10px] font-bold ${cat.color}`}>● Synced Live</span>
                </div>
                <Icon className={`w-8 h-8 ${cat.color}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Fuzzy OCR Plate Match Verifier */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-xs font-bold text-slate-200 uppercase">FUZZY OCR HOTLIST VERIFIER</span>
            <p className="text-[10px] text-slate-400 font-sans">
              Evaluates exact matches and Levenshtein distance &le; 1 character misread corrections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={testPlate}
            onChange={(e) => setTestPlate(e.target.value.toUpperCase())}
            placeholder="e.g. GJ01AB1234"
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-yellow-300 text-xs font-bold w-full md:w-44 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleTestCheck}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors shrink-0"
          >
            CHECK PLATE
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
            testResult.is_wanted
              ? 'bg-red-950/50 border-red-500/60 text-red-300'
              : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.is_wanted ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            <span className="font-bold">
              {testResult.is_wanted
                ? `MATCH FOUND: Tagged in ${testResult.match?.source_database} (${testResult.match?.reason})`
                : 'CLEAN REGISTRATION (NO HOTLIST FLAGS)'}
            </span>
          </div>
        </div>
      )}

      {/* Watchlist Entries Table */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">CATEGORY</th>
                <th className="p-3.5">TARGET IDENTIFIER</th>
                <th className="p-3.5">CASE REASON & SUMMARY</th>
                <th className="p-3.5">STATION</th>
                <th className="p-3.5">PRIORITY</th>
                <th className="p-3.5">SOURCE DATABASE</th>
                <th className="p-3.5">ALERTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {watchlists.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-900/40 transition-colors font-mono">
                  <td className="p-3.5">
                    <span className="bg-red-950/80 border border-red-500/40 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">
                      {entry.category}
                    </span>
                  </td>
                  <td 
                    onClick={() => openVehicleDrawer(entry.identifier)}
                    className="p-3.5 font-bold text-yellow-300 hover:underline cursor-pointer"
                  >
                    {entry.identifier}
                  </td>
                  <td className="p-3.5 font-sans">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{entry.reason}</span>
                      <span className="text-[11px] text-cyan-400 font-mono">{entry.case_number}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-300 font-sans">{entry.police_station}</td>
                  <td className="p-3.5 font-bold text-red-400">{entry.priority}</td>
                  <td className="p-3.5 text-slate-400 font-sans">{entry.source_database}</td>
                  <td className="p-3.5 font-bold text-cyan-300">{entry.alert_count} Sightings</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
