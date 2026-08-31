import React, { useState, useEffect } from 'react';
import { useAuthStore, ROLE_PRESETS } from '../../stores/authStore';
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
  Minimize,
  User,
  ChevronDown
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, officer, isBreakGlassActive, switchRolePreset, logout } = useAuthStore();
  const { unreadCount, audioAlertEnabled, toggleAudioAlert, clearUnread } = useAlertStore();
  const { selectedDepartment, setSelectedDepartment, setCommandPaletteOpen } = useUIStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clock, setClock] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

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

  const currentRole = user?.role || officer?.role || 'INVESTIGATOR';
  const roleBadgeColor = 
    currentRole === 'ADMIN' ? 'bg-red-950 text-red-300 border-red-500/50' :
    currentRole === 'SUPERVISOR' ? 'bg-purple-950 text-purple-300 border-purple-500/50' :
    currentRole === 'INVESTIGATOR' ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50' :
    'bg-emerald-950 text-emerald-300 border-emerald-500/50';

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
              Statewide Unified CCTV & Threat Intelligence
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

        {/* Officer Profile, Role Badge & Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-left"
          >
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{user?.full_name || officer?.badge_number || 'Duty Officer'}</span>
              <span className="text-[10px] text-slate-400 truncate max-w-[160px] font-sans">
                {user?.jurisdiction || officer?.district || 'Ahmedabad City'}
              </span>
            </div>

            <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadgeColor}`}>
              {currentRole}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Quick Role & Permission Dropdown */}
          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#090e1a] border border-slate-800 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 z-50 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active User Clearance</span>
                <span className="text-[10px] text-cyan-400 font-mono">{user?.officer_id || officer?.officer_id}</span>
              </div>

              <div className="text-[10px] text-slate-400 font-sans space-y-0.5">
                <div><strong>Rank:</strong> {user?.rank || officer?.rank}</div>
                <div><strong>Dept:</strong> {user?.department || 'Gujarat Police'}</div>
                <div><strong>Jurisdiction:</strong> {user?.jurisdiction || 'Statewide Command'}</div>
              </div>

              <div className="border-t border-slate-800/80 pt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Quick Role Switch (Demo):</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {(['OPERATOR', 'INVESTIGATOR', 'SUPERVISOR', 'ADMIN'] as const).map((rKey) => (
                    <button
                      key={rKey}
                      onClick={() => {
                        switchRolePreset(rKey);
                        setRoleDropdownOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-center transition-all ${
                        currentRole === rKey
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {rKey}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between">
                <button
                  onClick={() => {
                    setRoleDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 text-xs font-bold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>LOGOUT SESSION</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
