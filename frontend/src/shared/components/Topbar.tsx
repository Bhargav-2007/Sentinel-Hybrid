import React, { useState, useEffect } from 'react';
import { Shield, Bell, BellOff, Activity, User, ShieldAlert, ChevronDown, Search, Lock, GitBranch, Terminal } from 'lucide-react';
import { useAuthStore } from '../../core/auth/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useTargetStore } from '../../stores/targetStore';
import { UserRole } from '../../core/types/auth';

export const Topbar: React.FC = () => {
  const { user, setRole, logout } = useAuthStore();
  const { audioAlertsEnabled, toggleAudioAlerts } = useUIStore();
  const { activeTarget } = useTargetStore();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' IST');
      setDateStr(now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const rolesList: UserRole[] = ['OPERATOR', 'INVESTIGATOR', 'SOC_LEAD', 'ADMIN'];

  const latestLoc =
    activeTarget?.sightings && activeTarget.sightings.length > 0
      ? activeTarget.sightings[activeTarget.sightings.length - 1].camera_name
      : 'SG HIGHWAY ISKCON';

  return (
    <header className="h-14 bg-[#010409] border-b border-[#30363d] px-4 flex items-center justify-between z-30 sticky top-0 shrink-0 select-none">
      {/* GitHub Repository Breadcrumbs & Mark */}
      <div className="flex items-center gap-3 shrink-0">
        {/* GitHub Organization Mark */}
        <div className="w-8 h-8 rounded-md bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#f0f6fc] shadow-sm hover:border-[#8b949e] transition-colors cursor-pointer">
          <Shield className="w-4 h-4 text-[#f0f6fc]" />
        </div>

        {/* GitHub Repo Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-sm font-normal">
          <span className="text-[#58a6ff] hover:underline font-medium cursor-pointer">
            Gujarat-Police
          </span>
          <span className="text-[#8b949e] font-light">/</span>
          <span className="text-[#f0f6fc] font-semibold hover:underline cursor-pointer flex items-center gap-1.5">
            sentinel-csitms
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-[#30363d] text-[#8b949e] bg-[#161b22] ml-1">
            Public Command
          </span>
          <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-[#238636]/40 text-[#3fb950] bg-[#238636]/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#238636]"></span>
            Sec. 65B Verified
          </span>
        </div>
      </div>

      {/* Center Announcement / Hotlist APB Banner */}
      <div className="hidden md:flex items-center justify-center px-2 flex-1 max-w-xl">
        {activeTarget ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#da3633]/15 border border-[#da3633]/40 text-[#f85149] text-xs font-medium truncate animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-[#f85149] shrink-0" />
            <span className="truncate">
              <strong>SECURITY ADVISORY:</strong> Hotlist{' '}
              <span className="font-mono bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#da3633]/40 text-[#f0f6fc] text-[11px]">
                {activeTarget.plate}
              </span>{' '}
              at {latestLoc.toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 rounded-md bg-[#161b22] border border-[#30363d] text-xs text-[#8b949e]">
            <span className="w-2 h-2 rounded-full bg-[#238636]"></span>
            <span className="text-[#c9d1d9] font-medium">30/30 Feeds Synced</span>
            <span className="text-[#30363d]">&bull;</span>
            <span>RTSP Gateway: 103.250.160.189:8554</span>
          </div>
        )}
      </div>

      {/* Right Side GitHub Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* GitHub Command Search Bar */}
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
            window.dispatchEvent(event);
          }}
          className="h-8 hidden md:flex items-center gap-2.5 px-2.5 rounded-md bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-[#8b949e] text-xs transition-colors cursor-pointer shadow-sm"
          title="Search or jump to... (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[#8b949e]" />
          <span className="font-normal text-[#8b949e]">
            Type <kbd className="px-1 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[10px] text-[#c9d1d9] font-mono">/</kbd> to search
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[10px] text-[#8b949e] font-mono">
            Ctrl+K
          </kbd>
        </button>

        {/* Operational Status & Clock Badge */}
        <div className="h-8 hidden sm:flex items-center gap-2 px-2.5 rounded-md bg-[#161b22] border border-[#30363d] text-xs text-[#c9d1d9]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#238636] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#238636]"></span>
          </span>
          <span className="text-[11px] font-semibold text-[#3fb950] font-mono">
            OPERATIONAL
          </span>
          <span className="text-[#30363d]">|</span>
          <span className="font-mono text-xs text-[#8b949e]">
            {timeStr || '20:45:00 IST'}
          </span>
        </div>

        {/* Audio Siren Toggle */}
        <button
          onClick={toggleAudioAlerts}
          title={audioAlertsEnabled ? 'Siren Audio Alerts: Armed' : 'Siren Audio Alerts: Muted'}
          className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors cursor-pointer ${
            audioAlertsEnabled
              ? 'bg-[#da3633]/20 border-[#da3633] text-[#f85149]'
              : 'bg-[#21262d] hover:bg-[#30363d] border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc]'
          }`}
        >
          {audioAlertsEnabled ? <Bell className="w-4 h-4 text-[#f85149]" /> : <BellOff className="w-4 h-4" />}
        </button>

        {/* GitHub User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="h-8 flex items-center gap-2 pl-1 pr-2 rounded-md hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-all cursor-pointer"
          >
            {/* GitHub Style Circle Avatar */}
            <div className="w-6 h-6 rounded-full bg-[#1f6feb] border border-[#30363d] flex items-center justify-center text-white text-xs font-bold font-mono">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#f0f6fc] leading-tight truncate max-w-[120px]">
                {user?.full_name ? user.full_name.toLowerCase().replace(/\s+/g, '-') : 'vikram-rathore'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#8b949e]" />
          </button>

          {/* GitHub Style Dropdown Menu */}
          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-md shadow-2xl p-1 z-50 animate-in fade-in-50 duration-100">
              <div className="px-3 py-2 border-b border-[#30363d]">
                <p className="text-xs text-[#8b949e]">Signed in as</p>
                <p className="text-xs font-semibold text-[#f0f6fc] truncate">{user?.full_name || 'Inspector Vikram Rathore'}</p>
                <p className="text-[11px] text-[#8b949e] mt-0.5">{user?.station || 'Navrangpura PS, Ahmedabad'}</p>
                <p className="text-[10px] font-mono text-[#d29922] mt-0.5">Badge: {user?.badge_number || 'GJ-POL-7674'}</p>
              </div>

              <div className="py-1">
                <p className="text-[11px] font-semibold text-[#8b949e] px-3 py-1 uppercase tracking-wider">
                  Role Clearance
                </p>
                {rolesList.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      user?.role === r
                        ? 'bg-[#1f6feb] text-white font-semibold'
                        : 'text-[#c9d1d9] hover:bg-[#21262d]'
                    }`}
                  >
                    <span>{r}</span>
                    {user?.role === r && (
                      <span className="text-[10px] font-bold">✓ Active</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-[#30363d] pt-1 mt-1">
                <button
                  onClick={() => {
                    setRoleDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-md text-xs text-[#f85149] hover:bg-[#da3633]/20 transition-colors cursor-pointer font-medium"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
