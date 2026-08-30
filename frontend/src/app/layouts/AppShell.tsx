import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../core/auth/authStore';
import { useRealtimeStore, websocketManager } from '../../core/realtime/websocketService';
import { ContextDrawer } from '../../shared/components/ContextDrawer';
import { EventRail } from '../../shared/components/EventRail';
import { CommandPalette } from '../../shared/components/CommandPalette';
import { GlobalSearchModal } from '../../shared/components/GlobalSearchModal';
import { 
  Shield, 
  Search, 
  Bell, 
  Radio, 
  Maximize, 
  Minimize, 
  LogOut, 
  Flame,
  LayoutDashboard,
  Tv2,
  MapPin,
  ShieldAlert,
  FolderOpen,
  FileCheck,
  Camera,
  Server,
  BarChart3,
  ListFilter,
  Activity,
  Layers
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { officer, isBreakGlassActive, logout } = useAuthStore();
  const { unreadAlertCount } = useRealtimeStore();

  const [clock, setClock] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }));
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    websocketManager.connect();
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const navCategories = [
    {
      title: 'COMMAND',
      items: [
        { label: 'Overview', to: '/', icon: LayoutDashboard },
        { label: 'Live Operations', to: '/live', icon: Tv2 },
        { label: 'GIS / Situational', to: '/map', icon: MapPin },
        { label: 'Alert Center', to: '/alerts', icon: ShieldAlert, badge: unreadAlertCount },
        { label: 'Incident Center', to: '/incidents', icon: FolderOpen },
      ],
    },
    {
      title: 'INVESTIGATION',
      items: [
        { label: 'Vehicle Trace 360°', to: '/investigate/vehicle', icon: Search },
        { label: 'Event Explorer', to: '/events', icon: Activity },
        { label: 'Evidence Vault', to: '/evidence', icon: FileCheck },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { label: 'ANPR Live', to: '/analytics/anpr', icon: Search },
        { label: 'Crime Watchlists', to: '/watchlists', icon: ListFilter },
      ],
    },
    {
      title: 'REGISTRY & INFRA',
      items: [
        { label: 'Camera Registry', to: '/registry', icon: Camera },
        { label: 'Coverage Gaps', to: '/registry/coverage', icon: Layers },
        { label: 'VMS Federation', to: '/federation', icon: Server },
        { label: 'Central VMS / Storage', to: '/vms', icon: Server },
        { label: 'System Health', to: '/system/health', icon: BarChart3 },
      ],
    },
    {
      title: 'ADMIN & DEMO',
      items: [
        { label: 'Admin & Audit Logs', to: '/admin', icon: Shield },
        { label: 'Evaluation Demo', to: '/demo', icon: Activity },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans select-none">
      {/* LAYER A: TOP APP BAR */}
      <header className="h-14 bg-[#080d1a] border-b border-slate-800 px-4 flex items-center justify-between z-30 font-mono text-xs shadow-md">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-100 tracking-wider">GUJARAT POLICE</span>
              <span className="text-cyan-400 ml-1.5 font-semibold">SENTINEL COMMAND</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800 text-[11px]">
            <span className="text-slate-300">{clock} IST</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              SYSTEM OK
            </span>
          </div>
        </div>

        {/* Center: Global Search Quick Trigger */}
        <div 
          onClick={() => setIsSearchModalOpen(true)}
          className="hidden sm:flex items-center justify-between w-96 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl cursor-pointer transition-colors text-slate-400 text-xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Search camera, plate, vehicle, alert, incident...</span>
          </div>
          <kbd className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-slate-400 border border-slate-800 shrink-0">
            Ctrl+F
          </kbd>
        </div>

        {/* Right: Quick Controls & Officer Profile */}
        <div className="flex items-center gap-3">
          {/* Break Glass Banner */}
          {isBreakGlassActive && (
            <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/80 text-red-300 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
              <Flame className="w-3 h-3 text-red-400" />
              <span>BREAK-GLASS</span>
            </div>
          )}

          {/* Command Palette Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 text-[11px] transition-colors"
          >
            <span>COMMANDS</span>
            <kbd className="bg-slate-950 px-1 py-0.2 rounded text-[9px] text-slate-400 border border-slate-800">
              Ctrl+K
            </kbd>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* Officer Details */}
          {officer && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden xl:flex flex-col text-right">
                <span className="font-bold text-slate-200 text-[11px]">{officer.badge_number}</span>
                <span className="text-[9px] text-cyan-400">{officer.role}</span>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CENTER WORKSPACE: SIDEBAR + OPERATIONAL CANVAS */}
      <div className="flex-1 flex overflow-hidden">
        {/* LAYER A: SIDEBAR NAVIGATION */}
        <aside className="w-60 bg-[#080d1a] border-r border-slate-800 flex flex-col justify-between p-3 select-none overflow-y-auto font-mono text-xs shrink-0">
          <nav className="space-y-4">
            {navCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {cat.title}
                </span>
                <div className="space-y-0.5 pt-1">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                          isActive
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-500 text-white animate-pulse">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* LAYER B: OPERATIONAL CANVAS */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#060913] via-[#070c18] to-[#060913] p-4 lg:p-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* LAYER E: PERSISTENT REAL-TIME EVENT RAIL */}
      <EventRail />

      {/* LAYER C: UNIVERSAL RIGHT CONTEXT DRAWER */}
      <ContextDrawer />

      {/* LAYER F: GLOBAL OVERLAYS */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </div>
  );
};
