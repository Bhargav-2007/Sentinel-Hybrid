import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, MapPin, ShieldAlert, FolderLock, Radio, Cpu, X, Terminal } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { setGridMode } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const quickActions = [
    {
      id: 'live-all30',
      title: 'Switch to ALL 30 Cameras Grid',
      subtitle: 'Render all 30 statewide Gujarat CCTV video feeds simultaneously',
      icon: <Eye className="w-4 h-4 text-cyber-cyan" />,
      action: () => {
        setGridMode('all30');
        navigate('/live');
        setIsOpen(false);
      },
    },
    {
      id: 'live-3x3',
      title: 'Switch to 3x3 Priority Matrix',
      subtitle: '9-camera high-resolution tactical wall',
      icon: <Eye className="w-4 h-4 text-cyber-cyan" />,
      action: () => {
        setGridMode('3x3');
        navigate('/live');
        setIsOpen(false);
      },
    },
    {
      id: 'alerts-critical',
      title: 'View Active APB Hotlist Alerts',
      subtitle: 'Real-time threat intercepts & stolen vehicle sirens',
      icon: <ShieldAlert className="w-4 h-4 text-cyber-crimson" />,
      action: () => {
        navigate('/alerts');
        setIsOpen(false);
      },
    },
    {
      id: 'gis-map',
      title: 'Statewide GIS Tactical Map',
      subtitle: 'Interactive map of all Gujarat CCTV nodes & active threat markers',
      icon: <MapPin className="w-4 h-4 text-emerald-400" />,
      action: () => {
        navigate('/map');
        setIsOpen(false);
      },
    },
    {
      id: 'cases-view',
      title: 'Police Case Files & 65B Forensics',
      subtitle: 'Cryptographic evidence chains & court-admissible dossiers',
      icon: <FolderLock className="w-4 h-4 text-amber-400" />,
      action: () => {
        navigate('/cases');
        setIsOpen(false);
      },
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/investigate?plate=${encodeURIComponent(query.trim().toUpperCase())}`);
      setIsOpen(false);
      setQuery('');
    }
  };

  const filtered = quickActions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4 font-mono select-none animate-fadeIn">
      <div className="w-full max-w-2xl bg-sentinel-900 border-2 border-cyber-cyan/60 rounded-lg shadow-2xl overflow-hidden shadow-glow-cyan/20">
        {/* Header Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 p-3 bg-slate-950 border-b border-slate-800">
          <Terminal className="w-5 h-5 text-cyber-cyan" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Target Plate (e.g. GJ01AB1234) or Type a Command..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Content List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {query.trim() && (
            <div
              onClick={handleSearchSubmit as any}
              className="p-2.5 rounded bg-cyber-blue/20 hover:bg-cyber-blue/30 border border-cyber-blue/50 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cyber-cyan" />
                <span className="text-xs text-white font-bold">
                  Reconstruct 360° Trajectory for: <b className="text-yellow-400">{query.toUpperCase()}</b>
                </span>
              </div>
              <span className="text-[10px] text-cyber-cyan bg-slate-950 px-2 py-0.5 rounded border border-cyber-cyan/30">
                Press Enter ↵
              </span>
            </div>
          )}

          <div className="text-[10px] text-slate-500 px-2 py-1 uppercase tracking-wider font-bold">
            Tactical Operations & Quick Jumps
          </div>

          {filtered.map((action) => (
            <div
              key={action.id}
              onClick={action.action}
              className="p-2.5 rounded hover:bg-slate-950 border border-transparent hover:border-slate-800 flex items-center justify-between cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800 group-hover:border-cyber-cyan/40">
                  {action.icon}
                </div>
                <div>
                  <h4 className="text-xs text-white font-bold group-hover:text-cyber-cyan transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-[10px] text-slate-400">{action.subtitle}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold group-hover:text-slate-300">
                Jump →
              </span>
            </div>
          ))}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="p-2 bg-slate-950/90 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><b>ESC</b> to close</span>
            <span><b>↑↓</b> to navigate</span>
            <span><b>↵</b> to execute</span>
          </div>
          <span className="text-cyber-cyan">Gujarat Police Tactical Shell</span>
        </div>
      </div>
    </div>
  );
};
