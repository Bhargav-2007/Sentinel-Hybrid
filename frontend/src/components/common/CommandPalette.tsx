import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useVideoWallStore, VideoGridLayout } from '../../stores/videoWallStore';
import { useAlertStore } from '../../stores/alertStore';
import { 
  Search, 
  Tv2, 
  ShieldAlert, 
  Camera, 
  BarChart3, 
  ShieldCheck, 
  ListFilter, 
  Volume2, 
  VolumeX, 
  LayoutDashboard,
  Grid2X2,
  X
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { setLayout, toggleHud, togglePtzControl } = useVideoWallStore();
  const { toggleAudioAlert } = useAlertStore();
  const [query, setQuery] = useState('');

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K opens Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }

      // Escape closes palette
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }

      // Quick Layout switching when on live wall
      if (window.location.pathname === '/live-wall' && !commandPaletteOpen && !['INPUT', 'TEXTAREA'].includes((e.target as any)?.tagName)) {
        if (e.key === '1') setLayout('1x1');
        if (e.key === '2') setLayout('2x2');
        if (e.key === '3') setLayout('3x3');
        if (e.key === '4') setLayout('4x4');
        if (e.key === '5') setLayout('1+5');
        if (e.key === '7') setLayout('1+7');
        if (e.key.toLowerCase() === 'h') toggleHud();
        if (e.key.toLowerCase() === 'p') togglePtzControl();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen, setLayout, toggleHud, togglePtzControl]);

  if (!commandPaletteOpen) return null;

  const actions = [
    { label: 'Navigate: Situation Room (Dashboard)', icon: LayoutDashboard, action: () => navigate('/') },
    { label: 'Navigate: Master Video Wall', icon: Tv2, action: () => navigate('/live-wall') },
    { label: 'Navigate: APB Threat Alerts', icon: ShieldAlert, action: () => navigate('/alerts') },
    { label: 'Navigate: 360° Vehicle Search', icon: Search, action: () => navigate('/investigate') },
    { label: 'Navigate: VMS Camera Grid', icon: Camera, action: () => navigate('/cameras') },
    { label: 'Navigate: Crime Watchlists', icon: ListFilter, action: () => navigate('/watchlists') },
    { label: 'Navigate: Sizing & SRE Analytics', icon: BarChart3, action: () => navigate('/analytics') },
    { label: 'Navigate: Admin & Section 65B', icon: ShieldCheck, action: () => navigate('/admin') },
    { label: 'Video Wall: Switch to 2x2 Grid', icon: Grid2X2, action: () => { setLayout('2x2'); navigate('/live-wall'); } },
    { label: 'Video Wall: Switch to 3x3 Grid', icon: Tv2, action: () => { setLayout('3x3'); navigate('/live-wall'); } },
    { label: 'Video Wall: Toggle AI HUD Overlay', icon: Tv2, action: () => toggleHud() },
    { label: 'Video Wall: Toggle PTZ Telemetry Keypad', icon: Tv2, action: () => togglePtzControl() },
    { label: 'System: Toggle Audio Alarms (Mute/Unmute)', icon: Volume2, action: () => toggleAudioAlert() },
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
            placeholder="Type a tactical command or navigation shortcut (e.g. video wall, alerts, 2x2)..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Results */}
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1 text-xs">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/60 hover:bg-cyan-950/30 flex items-center justify-between text-left transition-colors text-slate-200 hover:text-cyan-200"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">ENTER ↵</span>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-500 text-xs">No matching commands found.</div>
          )}
        </div>

        {/* Footer Hotkey Tips */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 px-1">
          <span>Shortcuts: <strong>1-7</strong> (Grid layouts) • <strong>H</strong> (HUD) • <strong>P</strong> (PTZ)</span>
          <span>Press <strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
