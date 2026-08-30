import { create } from 'zustand';
import { Officer, OfficerRole, AuthTokens } from '../types/auth';

interface AuthState {
  officer: Officer | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isBreakGlassActive: boolean;
  breakGlassExpiresAt: string | null;
  setAuth: (tokens: AuthTokens, officer?: Officer) => void;
  setBreakGlass: (elevatedRole: OfficerRole, expiresAt: string) => void;
  logout: () => void;
}

const initialTokens: AuthTokens | null = (() => {
  const tokenStr = localStorage.getItem('sentinel_token');
  if (tokenStr) {
    try {
      return JSON.parse(tokenStr);
    } catch {
      return null;
    }
  }
  // Default demo state for quick access in police control room
  return {
    access_token: 'demo-jwt-token',
    token_type: 'Bearer',
    expires_in: 86400,
    officer_id: 'POLICE-AHM-042',
    badge_number: 'GJ-POL-8842',
    role: 'DUTY_OFFICER',
    district: 'Ahmedabad City',
    department: 'Gujarat Police State Command',
  };
})();

export const useAuthStore = create<AuthState>((set) => ({
  officer: initialTokens ? {
    id: 'off-042',
    officer_id: initialTokens.officer_id,
    badge_number: initialTokens.badge_number,
    full_name: 'Duty Officer (Ahmedabad)',
    role: initialTokens.role,
    rank: 'Inspector of Police',
    station: 'Navrangpura Police Station',
    district: initialTokens.district,
    department_id: 'POLICE',
    is_active: true,
    is_break_glass: false,
    created_at: new Date().toISOString(),
  } : null,
  tokens: initialTokens,
  isAuthenticated: Boolean(initialTokens),
  isBreakGlassActive: false,
  breakGlassExpiresAt: null,

  setAuth: (tokens, officer) => {
    localStorage.setItem('sentinel_token', JSON.stringify(tokens));
    set({
      tokens,
      isAuthenticated: true,
      officer: officer || {
        id: 'off-042',
        officer_id: tokens.officer_id,
        badge_number: tokens.badge_number,
        full_name: `Officer ${tokens.officer_id}`,
        role: tokens.role,
        rank: 'Police Inspector',
        station: 'State Control Room',
        district: tokens.district,
        department_id: 'POLICE',
        is_active: true,
        is_break_glass: false,
        created_at: new Date().toISOString(),
      },
    });
  },

  setBreakGlass: (elevatedRole, expiresAt) => {
    set((state) => ({
      isBreakGlassActive: true,
      breakGlassExpiresAt: expiresAt,
      officer: state.officer ? { ...state.officer, role: elevatedRole, is_break_glass: true } : null,
    }));
  },

  logout: () => {
    localStorage.removeItem('sentinel_token');
    set({
      officer: null,
      tokens: null,
      isAuthenticated: false,
      isBreakGlassActive: false,
      breakGlassExpiresAt: null,
    });
  },
}));
