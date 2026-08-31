import { create } from 'zustand';
import { Officer, OfficerRole, AuthTokens, UserContext } from '../types/auth';

interface AuthState {
  officer: Officer | null;
  user: UserContext | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isBreakGlassActive: boolean;
  breakGlassExpiresAt: string | null;
  hasPermission: (permission: string) => boolean;
  setAuth: (tokens: AuthTokens, officer?: Officer) => void;
  setBreakGlass: (elevatedRole: OfficerRole, expiresAt: string) => void;
  switchRolePreset: (presetName: 'OPERATOR' | 'INVESTIGATOR' | 'SUPERVISOR' | 'ADMIN') => void;
  logout: () => void;
}

// Preset Role Capabilities
export const ROLE_PRESETS = {
  OPERATOR: {
    officer_id: 'OP-AHM-012',
    badge_number: 'GJ-POL-8812',
    full_name: 'Patrol Operator Sharma',
    role: 'OPERATOR' as OfficerRole,
    rank: 'Police Head Constable',
    department: 'Gujarat Police — State Command',
    jurisdiction: 'Ahmedabad City Command Grid',
    district: 'Ahmedabad City',
    station: 'Navrangpura PS',
    permissions: [
      'dashboard.overview',
      'camera.read',
      'alert.read',
      'alert.acknowledge',
      'vehicle.search',
      'person.search',
      'evidence.read',
      'evidence.verify',
    ],
  },
  INVESTIGATOR: {
    officer_id: 'INV-AHM-042',
    badge_number: 'GJ-POL-8842',
    full_name: 'Inspector R.K. Jadeja (CID)',
    role: 'INVESTIGATOR' as OfficerRole,
    rank: 'Police Inspector (Crime Branch)',
    department: 'Gujarat Police — CID Crime',
    jurisdiction: 'Statewide Crime & Hotlist Operations',
    district: 'Ahmedabad City',
    station: 'Crime Branch HQ',
    permissions: [
      'dashboard.overview',
      'camera.read',
      'alert.read',
      'alert.acknowledge',
      'vehicle.search',
      'person.search',
      'investigation.advanced',
      'case.create',
      'case.manage',
      'evidence.read',
      'evidence.export',
      'evidence.verify',
    ],
  },
  SUPERVISOR: {
    officer_id: 'SUP-AHM-003',
    badge_number: 'GJ-POL-8803',
    full_name: 'ACP Vikramaditya Patel',
    role: 'SUPERVISOR' as OfficerRole,
    rank: 'Assistant Commissioner of Police',
    department: 'Gujarat Police — State Command',
    jurisdiction: 'Ahmedabad West Division Zone 1',
    district: 'Ahmedabad City',
    station: 'Divisional Command Center',
    permissions: [
      'dashboard.overview',
      'analytics.broad',
      'camera.read',
      'camera.manage',
      'camera.ptz',
      'alert.read',
      'alert.acknowledge',
      'alert.review',
      'alert.dispatch',
      'vehicle.search',
      'person.search',
      'investigation.advanced',
      'case.create',
      'case.manage',
      'case.review',
      'evidence.read',
      'evidence.export',
      'evidence.verify',
      'watchlist.manage',
    ],
  },
  ADMIN: {
    officer_id: 'ADMIN-GND-001',
    badge_number: 'GJ-DGP-0001',
    full_name: 'State DGP / Cyber Command Admin',
    role: 'ADMIN' as OfficerRole,
    rank: 'Director General of Police',
    department: 'Gujarat Police — State Cyber Command',
    jurisdiction: 'State of Gujarat (All 33 Districts)',
    district: 'Gandhinagar',
    station: 'Police Bhavan DGP Headquarters',
    permissions: [
      'dashboard.overview',
      'analytics.broad',
      'camera.read',
      'camera.manage',
      'camera.register',
      'camera.ptz',
      'alert.read',
      'alert.acknowledge',
      'alert.review',
      'alert.dispatch',
      'vehicle.search',
      'person.search',
      'investigation.advanced',
      'case.create',
      'case.manage',
      'case.review',
      'evidence.read',
      'evidence.export',
      'evidence.verify',
      'watchlist.manage',
      'user.manage',
      'system.config',
      'audit.full',
    ],
  },
};

const initialTokens: AuthTokens | null = (() => {
  const tokenStr = localStorage.getItem('sentinel_token');
  if (tokenStr) {
    try {
      return JSON.parse(tokenStr);
    } catch {
      return null;
    }
  }
  // Default to Investigator preset for hackathon evaluation
  const def = ROLE_PRESETS.INVESTIGATOR;
  return {
    access_token: 'sentinel-jwt-token-eval',
    token_type: 'Bearer',
    expires_in: 86400,
    officer_id: def.officer_id,
    badge_number: def.badge_number,
    role: def.role,
    district: def.district,
    department: def.department,
    jurisdiction: def.jurisdiction,
    permissions: def.permissions,
  };
})();

export const useAuthStore = create<AuthState>((set, get) => ({
  officer: initialTokens ? {
    id: 'off-active',
    officer_id: initialTokens.officer_id,
    badge_number: initialTokens.badge_number,
    full_name: initialTokens.user?.full_name || ROLE_PRESETS.INVESTIGATOR.full_name,
    role: initialTokens.role,
    rank: initialTokens.user?.rank || ROLE_PRESETS.INVESTIGATOR.rank,
    station: initialTokens.user?.station || ROLE_PRESETS.INVESTIGATOR.station,
    district: initialTokens.district,
    jurisdiction: initialTokens.jurisdiction || ROLE_PRESETS.INVESTIGATOR.jurisdiction,
    department_id: 'POLICE',
    is_active: true,
    is_break_glass: false,
    permissions: initialTokens.permissions || ROLE_PRESETS.INVESTIGATOR.permissions,
    created_at: new Date().toISOString(),
  } : null,
  user: initialTokens ? {
    identity: initialTokens.officer_id,
    officer_id: initialTokens.officer_id,
    badge_number: initialTokens.badge_number,
    full_name: initialTokens.user?.full_name || ROLE_PRESETS.INVESTIGATOR.full_name,
    role: initialTokens.role,
    rank: initialTokens.user?.rank || ROLE_PRESETS.INVESTIGATOR.rank,
    department: initialTokens.department || ROLE_PRESETS.INVESTIGATOR.department,
    jurisdiction: initialTokens.jurisdiction || ROLE_PRESETS.INVESTIGATOR.jurisdiction,
    district: initialTokens.district,
    station: initialTokens.user?.station || ROLE_PRESETS.INVESTIGATOR.station,
    permissions: initialTokens.permissions || ROLE_PRESETS.INVESTIGATOR.permissions,
  } : null,
  tokens: initialTokens,
  isAuthenticated: Boolean(initialTokens),
  isBreakGlassActive: false,
  breakGlassExpiresAt: null,

  hasPermission: (permission: string) => {
    const state = get();
    if (!state.isAuthenticated) return false;
    const userRole = state.user?.role || state.officer?.role;
    if (userRole === 'ADMIN') return true;
    const perms = state.user?.permissions || state.officer?.permissions || [];
    return perms.includes(permission) || perms.includes('*');
  },

  setAuth: (tokens, officer) => {
    localStorage.setItem('sentinel_token', JSON.stringify(tokens));
    const roleKey = (tokens.role as keyof typeof ROLE_PRESETS) || 'INVESTIGATOR';
    const preset = ROLE_PRESETS[roleKey] || ROLE_PRESETS.INVESTIGATOR;

    const userCtx: UserContext = tokens.user || {
      identity: tokens.officer_id,
      officer_id: tokens.officer_id,
      badge_number: tokens.badge_number,
      full_name: officer?.full_name || preset.full_name,
      role: tokens.role,
      rank: officer?.rank || preset.rank,
      department: tokens.department || preset.department,
      jurisdiction: tokens.jurisdiction || preset.jurisdiction,
      district: tokens.district,
      station: officer?.station || preset.station,
      permissions: tokens.permissions || preset.permissions,
    };

    set({
      tokens,
      isAuthenticated: true,
      user: userCtx,
      officer: officer || {
        id: 'off-active',
        officer_id: tokens.officer_id,
        badge_number: tokens.badge_number,
        full_name: userCtx.full_name,
        role: tokens.role,
        rank: userCtx.rank,
        station: userCtx.station || preset.station,
        district: tokens.district,
        jurisdiction: userCtx.jurisdiction,
        department_id: 'POLICE',
        is_active: true,
        is_break_glass: false,
        permissions: userCtx.permissions,
        created_at: new Date().toISOString(),
      },
    });
  },

  switchRolePreset: (presetName) => {
    const p = ROLE_PRESETS[presetName];
    const tokens: AuthTokens = {
      access_token: `token-${presetName.toLowerCase()}`,
      token_type: 'Bearer',
      expires_in: 86400,
      officer_id: p.officer_id,
      badge_number: p.badge_number,
      role: p.role,
      district: p.district,
      department: p.department,
      jurisdiction: p.jurisdiction,
      permissions: p.permissions,
      user: {
        identity: p.officer_id,
        officer_id: p.officer_id,
        badge_number: p.badge_number,
        full_name: p.full_name,
        role: p.role,
        rank: p.rank,
        department: p.department,
        jurisdiction: p.jurisdiction,
        district: p.district,
        station: p.station,
        permissions: p.permissions,
      }
    };
    get().setAuth(tokens);
  },

  setBreakGlass: (elevatedRole, expiresAt) => {
    set((state) => ({
      isBreakGlassActive: true,
      breakGlassExpiresAt: expiresAt,
      officer: state.officer ? { ...state.officer, role: elevatedRole, is_break_glass: true } : null,
      user: state.user ? { ...state.user, role: elevatedRole, permissions: ROLE_PRESETS.ADMIN.permissions } : null,
    }));
  },

  logout: () => {
    localStorage.removeItem('sentinel_token');
    set({
      officer: null,
      user: null,
      tokens: null,
      isAuthenticated: false,
      isBreakGlassActive: false,
      breakGlassExpiresAt: null,
    });
  },
}));
