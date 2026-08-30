import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAlertStore } from '../../stores/alertStore';
import { 
  LayoutDashboard, 
  Tv2, 
  ShieldAlert, 
  Search, 
  Camera, 
  ListFilter, 
  BarChart3, 
  ShieldCheck, 
  Activity
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { unreadCount, alerts } = useAlertStore();

  const activePursuits = alerts.filter((a) => a.status === 'INVESTIGATING').length;

  const navItems = [
    { to: '/', label: 'Situation Room', icon: LayoutDashboard },
    { to: '/live-wall', label: 'Live Video Wall', icon: Tv2 },
    { to: '/alerts', label: 'APB Alerts', icon: ShieldAlert, badge: unreadCount },
    { to: '/investigate', label: '360° Search', icon: Search },
    { to: '/cameras', label: 'VMS Cameras', icon: Camera },
    { to: '/watchlists', label: 'Crime Watchlists', icon: ListFilter },
    { to: '/analytics', label: 'Sizing & SRE', icon: BarChart3 },
    { to: '/admin', label: 'Admin & Sec 65B', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-[#080d1a] border-r border-slate-800 flex flex-col justify-between p-3 select-none">
      {/* Navigation Links */}
      <nav className="space-y-1 font-mono">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          COMMAND OPERATIONS
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-cyan-400" />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Dispatch Widget */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] font-bold">STATE PURSUITS</span>
          </div>
          <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
            {activePursuits} ACTIVE
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          YOLO11 real-time vehicle correlation synchronized across 50 state checkpoints.
        </p>
      </div>
    </aside>
  );
};
