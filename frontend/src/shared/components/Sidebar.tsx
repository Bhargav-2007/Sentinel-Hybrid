import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Video,
  Search,
  MapPin,
  AlertTriangle,
  FolderLock,
  Camera,
  ListOrdered,
  Activity,
  BarChart3,
  Shield,
  Users,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../../core/auth/authStore';
import { hasPermission, PERMISSIONS } from '../../core/auth/permissions';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const navItems = [
    {
      to: '/live',
      label: 'Live Command',
      icon: Video,
      allowed: true,
    },
    {
      to: '/investigate',
      label: 'Investigation',
      icon: Search,
      allowed: hasPermission(role, PERMISSIONS.VIEW_INVESTIGATION_DOSSIER),
    },
    {
      to: '/map',
      label: 'Statewide GIS',
      icon: MapPin,
      allowed: true,
    },
    {
      to: '/alerts',
      label: 'Threat Alerts',
      icon: AlertTriangle,
      badge: '2',
      allowed: true,
    },
    {
      to: '/cases',
      label: 'Case Files',
      icon: FolderLock,
      allowed: hasPermission(role, PERMISSIONS.CREATE_CASE),
    },
    {
      to: '/cameras',
      label: 'Camera Grid',
      icon: Camera,
      allowed: true,
    },
    {
      to: '/watchlists',
      label: 'Watchlists & Hotlists',
      icon: ListOrdered,
      allowed: hasPermission(role, PERMISSIONS.MANAGE_WATCHLISTS),
    },
    {
      to: '/system-status',
      label: 'System Status',
      icon: Activity,
      allowed: true,
    },
    {
      to: '/analytics',
      label: 'AI Analytics',
      icon: BarChart3,
      allowed: true,
    },
    {
      to: '/audit',
      label: 'Section 65B Audit',
      icon: Shield,
      allowed: hasPermission(role, PERMISSIONS.VIEW_AUDIT_LOGS),
    },
    {
      to: '/users',
      label: 'Officer Accounts',
      icon: Users,
      allowed: hasPermission(role, PERMISSIONS.MANAGE_USERS),
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      allowed: true,
    },
    {
      to: '/help',
      label: 'SOP & Guide',
      icon: HelpCircle,
      allowed: true,
    },
  ];

  return (
    <aside className="w-64 bg-sentinel-900/95 backdrop-blur border-r border-slate-800 flex flex-col justify-between p-3 select-none">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
          Tactical Operations
        </div>

        {navItems
          .filter((item) => item.allowed)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded font-mono text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyber-cyan/20 to-transparent border-l-2 border-cyber-cyan text-cyber-cyan shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyber-crimson text-white text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
      </div>

      {/* Edge Ingestion Telemetry Footer */}
      <div className="p-3 rounded bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span>Grid Nodes:</span>
          <span className="text-cyber-cyan font-bold">30 Active</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Inference:</span>
          <span className="text-emerald-400 font-bold">19.0 ms (YOLO)</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Bandwidth Saved:</span>
          <span className="text-cyber-emerald font-bold">99.95%</span>
        </div>
      </div>
    </aside>
  );
};
