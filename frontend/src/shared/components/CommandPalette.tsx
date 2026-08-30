import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Tv2, 
  ShieldAlert, 
  Camera, 
  BarChart3, 
  ShieldCheck, 
  ListFilter, 
  Volume2, 
  LayoutDashboard,
  Grid2X2,
  X,
  FileCheck,
  Activity,
  Server,
  FolderOpen
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { label: 'Go to Command Overview (Situation Room)', icon: LayoutDashboard, route: '/' },
    { label: 'Go to Live Operations (16-Camera Wall)', icon: Tv2, route: '/live' },
    { label: 'Go to GIS Situational Map', icon: Activity, route: '/map' },
    { label: 'Go to Alert Center & Triage', icon: ShieldAlert, route: '/alerts' },
    { label: 'Go to Incident Workspace', icon: FolderOpen, route: '/incidents' },
    { label: 'Go to 360° Vehicle Investigation (GJ01AB1234)', icon: Search, route: '/investigate/vehicle' },
    { label: 'Go to Live ANPR Workspace', icon: Search, route: '/analytics/anpr' },
    { label: 'Go to Crime Watchlists (eGujCop / VAHAN)', icon: ListFilter, route: '/watchlists' },
    { label: 'Go to Event Explorer', icon: Activity, route: '/events' },
    { label: 'Go to Evidence Management (Section 65B)', icon: FileCheck, route: '/evidence' },
    { label: 'Go to Camera Registry & Onboarding', icon: Camera, route: '/registry' },
    { label: 'Go to VMS Federation & Connectors', icon: Server, route: '/federation' },
    { label: 'Go to Central VMS Storage & Ingestion', icon: Server, route: '/vms' },
    { label: 'Go to System Health & Telemetry', icon: BarChart3, route: '/system/health' },
    { label: 'Go to Admin & Forensic Audit Ledger', icon: ShieldCheck, route: '/admin' },
    { label: 'Go to Official Hackathon Demo Flow', icon: Activity, route: '/demo' },
  ];

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4 font-mono select-none">
      <div className="bg-[#0b101d] border border-cyan-500/50 rounded-2xl max-w-xl w-full p-4 text-slate-100 shadow-2xl relative flex flex-col gap-3">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700 px-3.5 py-2.5 rounded-xl">
          <Search className="w-4 h-4 text-cyan-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or fast jump (e.g. live, vehicle, map, registry)..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Results */}
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1 text-xs">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  navigate(item.route);
                  onClose();
                }}
                className="w-full p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 hover:bg-cyan-950/30 flex items-center justify-between text-left transition-colors text-slate-200 hover:text-cyan-200"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] text-slate-500">ENTER ↵</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800 px-1">
          <span>Command Navigation Matrix</span>
          <span>Press <strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
};
