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
  GitBranch,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../core/auth/authStore';
import { hasPermission, PERMISSIONS } from '../../core/auth/permissions';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  allowed: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  const sections: NavSection[] = [
    {
      title: 'Surveillance & Feeds',
      items: [
        {
          to: '/live',
          label: 'Live Command Matrix',
          icon: Video,
          allowed: true,
        },
        {
          to: '/map',
          label: 'Statewide GIS Map',
          icon: MapPin,
          allowed: true,
        },
        {
          to: '/cameras',
          label: 'CCTV Camera Registry',
          icon: Camera,
          badge: '30',
          allowed: true,
        },
      ],
    },
    {
      title: 'Investigation & Advisories',
      items: [
        {
          to: '/alerts',
          label: 'Threat Alerts & APBs',
          icon: AlertTriangle,
          badge: '2 live',
          allowed: true,
        },
        {
          to: '/investigate',
          label: 'Target Investigation',
          icon: Search,
          allowed: hasPermission(role, PERMISSIONS.VIEW_INVESTIGATION_DOSSIER),
        },
        {
          to: '/cases',
          label: 'Case Dossiers & Evidence',
          icon: FolderLock,
          allowed: hasPermission(role, PERMISSIONS.CREATE_CASE),
        },
      ],
    },
    {
      title: 'Analytics & Audit',
      items: [
        {
          to: '/watchlists',
          label: 'Watchlists & Hotlists',
          icon: ListOrdered,
          allowed: hasPermission(role, PERMISSIONS.MANAGE_WATCHLISTS),
        },
        {
          to: '/analytics',
          label: 'AI Vision Analytics',
          icon: BarChart3,
          allowed: true,
        },
        {
          to: '/audit',
          label: 'Sec. 65B Audit Trail',
          icon: Shield,
          allowed: hasPermission(role, PERMISSIONS.VIEW_AUDIT_LOGS),
        },
      ],
    },
    {
      title: 'Settings & Health',
      items: [
        {
          to: '/system-status',
          label: 'System & Gateway Health',
          icon: Activity,
          allowed: true,
        },
        {
          to: '/users',
          label: 'Officer Accounts & RBAC',
          icon: Users,
          allowed: hasPermission(role, PERMISSIONS.MANAGE_USERS),
        },
        {
          to: '/settings',
          label: 'Console Settings',
          icon: Settings,
          allowed: true,
        },
        {
          to: '/help',
          label: 'SOP & Operations Manual',
          icon: HelpCircle,
          allowed: true,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0d1117] border-r border-[#30363d] flex flex-col justify-between p-3 select-none shrink-0 h-full overflow-hidden">
      {/* Scrollable Navigation Sections */}
      <div className="space-y-4 overflow-y-auto pr-1">
        {sections.map((sec, idx) => {
          const visibleItems = sec.items.filter((item) => item.allowed);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.title} className={idx > 0 ? 'pt-2 border-t border-[#21262d]' : ''}>
              <div className="px-3 pb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                  {sec.title}
                </span>
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors group relative ${
                        isActive
                          ? 'bg-[#21262d] text-[#f0f6fc] font-semibold before:absolute before:left-[-2px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#fd8c73] before:rounded-full'
                          : 'text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d]/60'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          <item.icon
                            className={`w-4 h-4 transition-colors ${
                              isActive ? 'text-[#58a6ff]' : 'text-[#8b949e] group-hover:text-[#c9d1d9]'
                            }`}
                          />
                          <span className="tracking-tight">{item.label}</span>
                        </div>
                        {item.badge ? (
                          item.badge.includes('live') ? (
                            <span className="px-1.5 py-0.2 rounded-full border border-[#da3633]/40 bg-[#da3633]/15 text-[#f85149] text-[10px] font-medium font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f85149] animate-pulse"></span>
                              {item.badge}
                            </span>
                          ) : (
                            <span className="gh-counter text-[10px]">
                              {item.badge}
                            </span>
                          )
                        ) : null}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* GitHub Repository Status & Environment Card */}
      <div className="mt-3 p-2.5 rounded-md bg-[#161b22] border border-[#30363d] text-[11px] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[#f0f6fc] font-semibold">
            <GitBranch className="w-3.5 h-3.5 text-[#8b949e]" />
            <span>main</span>
          </div>
          <span className="text-[10px] font-mono font-medium border border-[#238636]/40 bg-[#238636]/15 text-[#3fb950] px-1.5 py-0.2 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]"></span>
            30/30 Active
          </span>
        </div>

        <div className="space-y-1 text-[10px] text-[#8b949e] font-mono">
          <div className="flex items-center justify-between">
            <span>RTSP Gateway:</span>
            <span className="text-[#c9d1d9]">103.250.160.189:8554</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Audit Digest:</span>
            <span className="text-[#3fb950] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#3fb950]" />
              Sec. 65B Verified
            </span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-[#30363d] flex items-center justify-between text-[10px] text-[#8b949e]">
          <span>release v2.4.0</span>
          <span className="text-[#58a6ff] hover:underline cursor-pointer">production</span>
        </div>
      </div>
    </aside>
  );
};
