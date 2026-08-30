import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Car, Camera, ShieldAlert, X, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const term = searchTerm.trim().toUpperCase();

  // Dynamic real search targets based on user query
  const searchActions = term.length > 0 ? [
    {
      type: 'VEHICLE',
      title: `Query Vehicle Plate: ${term}`,
      subtitle: '360° Multi-Camera Dossier & VAHAN Cross-Reference',
      action: () => { onClose(); navigate(`/investigate?plate=${encodeURIComponent(term)}`); }
    },
    {
      type: 'CAMERA',
      title: `Filter Cameras: "${searchTerm}"`,
      subtitle: 'Model 1 Central Registry & Live Video Wall',
      action: () => { onClose(); navigate(`/live-wall?search=${encodeURIComponent(searchTerm)}`); }
    },
    {
      type: 'ALERT',
      title: `Search Alerts: "${searchTerm}"`,
      subtitle: 'Active Crime & Security Event Log',
      action: () => { onClose(); navigate(`/alerts?query=${encodeURIComponent(searchTerm)}`); }
    }
  ] : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 font-mono select-none">
      <div className="bg-[#0b101d] border border-slate-700 rounded-2xl max-w-2xl w-full p-5 text-slate-100 shadow-2xl relative flex flex-col gap-4">
        {/* Search Input */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-4 py-3 rounded-xl">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            autoFocus
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Universal Live Search: plate (GJ01AB1234), camera ID, FIR #, alert..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {searchActions.length > 0 ? (
            searchActions.map((res, i) => (
              <div
                key={i}
                onClick={res.action}
                className="p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  {res.type === 'VEHICLE' && <Car className="w-5 h-5 text-yellow-300" />}
                  {res.type === 'CAMERA' && <Camera className="w-5 h-5 text-cyan-400" />}
                  {res.type === 'ALERT' && <ShieldAlert className="w-5 h-5 text-red-400" />}
                  <div>
                    <span className="font-bold text-xs text-slate-100">{res.title}</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">{res.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              Enter a vehicle registration plate, camera identifier, or keyword above to query live databases.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
