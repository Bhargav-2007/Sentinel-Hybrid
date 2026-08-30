import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistService } from '../../services/watchlistService';
import { WatchlistCategory, WatchlistPriority } from '../../types/watchlist';
import { 
  ListFilter, 
  Plus, 
  ShieldAlert, 
  Search, 
  CheckCircle2
} from 'lucide-react';

export const WatchlistsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testPlate, setTestPlate] = useState('GJ01AB1234');
  const [testResult, setTestResult] = useState<any>(null);

  // New Entry Form State
  const [newEntry, setNewEntry] = useState({
    category: 'STOLEN_VEHICLE' as WatchlistCategory,
    identifier: '',
    reason: '',
    case_number: '',
    police_station: 'Navrangpura Police Station',
    priority: 'CRITICAL' as WatchlistPriority,
    source_database: 'eGujCop',
  });

  // Fetch Watchlists
  const { data: watchlists = [], isLoading } = useQuery({
    queryKey: ['watchlists'],
    queryFn: () => watchlistService.listWatchlists(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => watchlistService.createEntry(data),
    onSuccess: () => {
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  // Test Plate Mutation
  const handleTestCheck = async () => {
    try {
      const res = await watchlistService.checkPlate(testPlate.trim().toUpperCase());
      setTestResult(res);
    } catch (e: any) {
      alert(`Plate check error: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#090e1a] p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              eGujCop & VAHAN CRIME WATCHLISTS & APB HOTLISTS
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              State Police Wanted Vehicles, Stolen Auto Records, and Fuzzy OCR Intercept Registry
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wider transition-all shadow-md shadow-red-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>ADD WANTED TARGET</span>
        </button>
      </div>

      {/* Fuzzy OCR Plate Match Tester */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Search className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-xs font-bold text-slate-200">FUZZY OCR HOTLIST VERIFIER</span>
            <p className="text-[10px] text-slate-400 font-sans">
              Tests exact and Levenshtein distance &le; 1 OCR character misrecognitions
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
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition-colors shrink-0"
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
              {testResult.is_wanted ? `MATCH FOUND: Tagged in ${testResult.match?.source_database} (${testResult.match?.reason})` : 'NO ACTIVE WARRANTS / HOTLIST FLAGS'}
            </span>
          </div>
        </div>
      )}

      {/* Watchlist Entries Table */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">CATEGORY</th>
                <th className="p-3.5">IDENTIFIER / PLATE</th>
                <th className="p-3.5">REASON & CASE DETAILS</th>
                <th className="p-3.5">STATION</th>
                <th className="p-3.5">PRIORITY</th>
                <th className="p-3.5">SOURCE</th>
                <th className="p-3.5">ALERTS TRIGGERED</th>
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
                  <td className="p-3.5 font-bold text-yellow-300">{entry.identifier}</td>
                  <td className="p-3.5 font-sans">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{entry.reason}</span>
                      <span className="text-[11px] text-cyan-400">{entry.case_number}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-300 font-sans">{entry.police_station}</td>
                  <td className="p-3.5">
                    <span className="text-[10px] font-bold text-red-400">{entry.priority}</span>
                  </td>
                  <td className="p-3.5 text-slate-400 font-sans">{entry.source_database}</td>
                  <td className="p-3.5 font-bold text-cyan-300">{entry.alert_count} Sightings</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101d] border border-red-500/40 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl flex flex-col gap-4">
            <h2 className="text-sm font-bold font-mono text-red-400 uppercase tracking-wider">
              REGISTER WANTED VEHICLE / SUSPECT
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newEntry);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-[10px] text-slate-400">LICENSE PLATE / IDENTIFIER</label>
                <input
                  type="text"
                  required
                  value={newEntry.identifier}
                  onChange={(e) => setNewEntry({ ...newEntry, identifier: e.target.value.toUpperCase() })}
                  placeholder="GJ01AB1234"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-yellow-300 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">CRIME REASON / FIR SUMMARY</label>
                <textarea
                  rows={2}
                  required
                  value={newEntry.reason}
                  onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
                  placeholder="Stolen SUV involved in armed robbery under FIR 881/2026"
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">FIR / CASE NUMBER</label>
                  <input
                    type="text"
                    required
                    value={newEntry.case_number}
                    onChange={(e) => setNewEntry({ ...newEntry, case_number: e.target.value })}
                    placeholder="FIR-2026-CR-0881"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">POLICE STATION</label>
                  <input
                    type="text"
                    required
                    value={newEntry.police_station}
                    onChange={(e) => setNewEntry({ ...newEntry, police_station: e.target.value })}
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
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  SAVE WANTED TARGET
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
