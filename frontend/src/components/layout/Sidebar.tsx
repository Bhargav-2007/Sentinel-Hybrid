import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAlertStore } from '../../stores/alertStore';
import { useAuthStore } from '../../stores/authStore';
import { 
  LayoutDashboard, 
  Tv2, 
  ShieldAlert, 
  Car, 
  UserSearch, 
  Map, 
  Briefcase, 
  FileCheck2, 
  Sliders, 
  Activity,
  Lock
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { unreadCount, alerts } = useAlertStore();
  const { hasPermission, user } = useAuthStore();

  const activePursuits = alerts.filter((a) => a.status === 'INVESTIGATING').length;

  const allNavItems = [
    { 
      to: '/', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      permission: 'dashboard.overview' 
    },
    { 
      to: '/live-wall', 
      label: 'Live Monitoring', 
      icon: Tv2, 
      permission: 'camera.read' 
    },
    { 
      to: '/alerts', 
      label: 'Alerts', 
      icon: ShieldAlert, 
      badge: unreadCount, 
      permission: 'alert.read' 
    },
    { 
      to: '/vehicles', 
      label: 'Vehicle Search', 
      icon: Car, 
      permission: 'vehicle.search' 
    },
    { 
      to: '/persons', 
      label: 'Person Search', 
      icon: UserSearch, 
      permission: 'person.search' 
    },
    { 
      to: '/gis', 
      label: 'GIS Map', 
      icon: Map, 
      permission: 'camera.read' 
    },
    { 
      to: '/cases', 
      label: 'Investigation / Cases', 
      icon: Briefcase, 
      permission: 'case.create' 
    },
    { 
      to: '/evidence', 
      label: 'Evidence', 
      icon: FileCheck2, 
      permission: 'evidence.read' 
    },
    { 
      to: '/admin', 
      label: 'Administration', 
      icon: Sliders, 
      permission: 'camera.manage' 
    },
  ];

  // Filter items based on user's granted permissions
  const authorizedNavItems = allNavItems.filter((item) => hasPermission(item.permission));

  return (
    <aside className="w-64 bg-[#080d1a] border-r border-slate-800 flex flex-col justify-between p-3 select-none">
      {/* Navigation Links */}
      <nav className="space-y-1 font-mono">
        <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>OPERATIONS</span>
          <span className="text-[9px] text-cyan-400 font-sans">{user?.role || 'OPERATOR'}</span>
        </div>

        {authorizedNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
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

      {/* Bottom Dispatch / Jurisdiction Widget */}
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
          {user?.jurisdiction || 'Gujarat Police Unified Command Grid'} • Section 65B Certified
        </p>
      </div>
    </aside>
  );
};
