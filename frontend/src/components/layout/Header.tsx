import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAlertStore } from '../../stores/alertStore';
import { useUIStore } from '../../stores/uiStore';
import { DepartmentCode } from '../../types/camera';
import { 
  Shield, 
  ShieldAlert, 
  Bell, 
  Volume2, 
  VolumeX, 
  Search, 
  Radio, 
  Flame, 
  LogOut,
  Sliders,
  Maximize,
  Minimize
} from 'lucide-react';

export const Header: React.FC = () => {
  const { officer, isBreakGlassActive, logout } = useAuthStore();
  const { unreadCount, audioAlertEnabled, toggleAudioAlert, clearUnread } = useAlertStore();
  const { selectedDepartment, setSelectedDepartment, setCommandPaletteOpen } = useUIStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clock, setClock] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const departments: { code: DepartmentCode | 'ALL'; label: string }[] = [
    { code: 'ALL', label: 'All State CCTV' },
    { code: 'POLICE', label: 'Gujarat Police' },
    { code: 'TRANSPORT_RTO', label: 'Transport / RTO' },
    { code: 'MUNICIPALITY_AMC', label: 'AMC Smart City' },
    { code: 'BORDER_SECURITY', label: 'Border Security' },
    { code: 'FOREST_WILDLIFE', label: 'Forest & Wildlife' },
  ];

  return (
    <header className="h-16 bg-[#080d1a] border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between z-30 select-none shadow-xl">
      {/* Brand & Department Filters */}
      <div className="flex items-center gap-4">
        {/* Gujarat Police Emblem / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-700 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#080d1a] rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="hidden sm:block font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100 tracking-wider">GUJARAT SENTINEL</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/40 px-1.5 py-0.2 rounded font-semibold">
                SOC v6.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              State Police AI Surveillance Platform
            </p>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-full text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-300 font-bold">LIVE CORP8 WAN</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 font-mono">{clock} IST</span>
        </div>

        {/* Multi-Department Tab Switcher */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
          {departments.map((dept) => (
            <button
              key={dept.code}
              onClick={() => setSelectedDepartment(dept.code)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedDepartment === dept.code
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Controls: Command Search, Audio Mute, Fullscreen, Officer Profile */}
      <div className="flex items-center gap-3 font-mono">
        {/* Break-Glass Indicator Banner */}
        {isBreakGlassActive && (
          <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-500/80 text-red-300 px-3 py-1 rounded-lg text-xs font-bold animate-pulse">
            <Flame className="w-4 h-4 text-red-400" />
            <span>BREAK-GLASS ACTIVE</span>
          </div>
        )}

        {/* Command Palette Hotkey Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 text-xs font-mono transition-colors"
          title="Open Tactical Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span>COMMANDS</span>
          <kbd className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-slate-300 border border-slate-800 font-bold">
            Ctrl+K
          </kbd>
        </button>

        {/* Audio Alarm Toggle */}
        <button
          onClick={toggleAudioAlert}
          className={`p-2 rounded-lg border transition-colors ${
            audioAlertEnabled
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
          title={audioAlertEnabled ? 'Alarm Audio Active' : 'Alarm Audio Muted'}
        >
          {audioAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Toggle Command Wall Fullscreen"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Officer Profile & Badge */}
        {officer && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{officer.badge_number}</span>
              <span className="text-[10px] text-cyan-400">{officer.role}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
