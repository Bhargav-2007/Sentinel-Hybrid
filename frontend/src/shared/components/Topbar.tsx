import React, { useState, useEffect } from 'react';
import { Shield, Bell, BellOff, Activity, User, ShieldAlert, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../core/auth/authStore';
import { useUIStore } from '../../stores/uiStore';
import { UserRole } from '../../core/types/auth';

export const Topbar: React.FC = () => {
  const { user, setRole } = useAuthStore();
  const { audioAlertsEnabled, toggleAudioAlerts } = useUIStore();
  const [timeStr, setTimeStr] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' IST');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rolesList: UserRole[] = ['OPERATOR', 'INVESTIGATOR', 'SOC_LEAD', 'ADMIN'];

  return (
    <header className="h-16 bg-sentinel-900/90 backdrop-blur border-b border-slate-800 px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & State Badge */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-gradient-to-br from-sentinel-800 to-slate-900 border border-cyber-cyan/40 flex items-center justify-center shadow-glow-cyan">
          <Shield className="w-6 h-6 text-cyber-cyan" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider font-mono bg-gradient-to-r from-white via-slate-200 to-cyber-cyan bg-clip-text text-transparent">
              GUJARAT POLICE SENTINEL
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyber-blue/20 border border-cyber-blue/40 text-cyber-cyan font-semibold">
              HYBRID SOC
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            State Command & Investigation Platform &bull; Innovation 2026
          </p>
        </div>
      </div>

      {/* Center Ticker: APB Alert Banner */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded bg-cyber-crimson/15 border border-cyber-crimson/40 text-cyber-crimson font-mono text-xs font-semibold animate-pulse-fast">
        <ShieldAlert className="w-4 h-4" />
        <span>HOTLIST APB: WANTED VEHICLE GJ01AB1234 SIGHTED (SG HIGHWAY)</span>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
            window.dispatchEvent(event);
          }}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs transition-colors"
          title="Open Command Palette (Ctrl+K)"
        >
          <span className="text-cyber-cyan font-bold">⌘ Quick Search</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] text-slate-400 font-bold">
            Ctrl + K
          </kbd>
        </button>

        {/* System Pulse Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">100% ONLINE</span>
          <span className="text-slate-600">|</span>
          <span>{timeStr || '11:35:00 IST'}</span>
        </div>

        {/* Audio Alert Toggle */}
        <button
          onClick={toggleAudioAlerts}
          title={audioAlertsEnabled ? 'Disable Audio Siren' : 'Enable Audio Siren'}
          className={`p-2 rounded border transition-colors ${
            audioAlertsEnabled
              ? 'bg-cyber-crimson/20 border-cyber-crimson/60 text-cyber-crimson'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {audioAlertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>

        {/* Officer Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-cyber-cyan/50 text-left transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-sentinel-800 border border-slate-700 flex items-center justify-center text-cyber-cyan">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-200 font-mono leading-none">{user?.full_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyber-cyan/10 text-cyber-cyan font-bold leading-tight">
                  {user?.role}
                </span>
                <span className="text-[10px] font-mono text-slate-400 leading-tight">
                  ({user?.badge_number})
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Role Switcher Menu */}
          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded shadow-xl p-2 z-50">
              <p className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase tracking-wider">
                Switch Role (RBAC Testing)
              </p>
              {rolesList.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                    user?.role === r
                      ? 'bg-cyber-cyan/20 text-cyber-cyan font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{r}</span>
                  {user?.role === r && <span className="text-[10px]">● ACTIVE</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
