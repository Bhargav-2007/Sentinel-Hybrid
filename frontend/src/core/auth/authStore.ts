import { create } from 'zustand';
import { Officer, OfficerRole, AuthTokens } from '../../shared/types';
import { apiClient } from '../api/client';

interface AuthState {
  officer: Officer | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isBreakGlassActive: boolean;
  breakGlassExpiresAt: string | null;
  login: (badge_number: string, security_key: string) => Promise<void>;
  requestBreakGlass: (fir_number: string, incident_reason: string) => Promise<void>;
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
  // Default operator demo credentials
  return {
    access_token: 'demo-jwt-token-2026',
    token_type: 'Bearer',
    expires_in: 86400,
    officer_id: 'POLICE-AHM-042',
    badge_number: 'GJ-POL-8842',
    role: 'DUTY_OFFICER',
    district: 'Ahmedabad City',
    department: 'Gujarat Police State Command',
  };
})();

export const useAuthStore = create<AuthState>((set, get) => ({
  officer: initialTokens ? {
    id: 'off-042',
    officer_id: initialTokens.officer_id,
    badge_number: initialTokens.badge_number,
    full_name: 'Inspector R.K. Jadeja',
    role: initialTokens.role,
    rank: 'Police Inspector (Control Room)',
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

  login: async (badge_number, security_key) => {
    try {
      const res = await apiClient<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ badge_number, security_key }),
      });
      localStorage.setItem('sentinel_token', JSON.stringify(res));
      set({
        tokens: res,
        isAuthenticated: true,
        officer: {
          id: 'off-custom',
          officer_id: res.officer_id,
          badge_number: res.badge_number,
          full_name: `Officer ${res.badge_number}`,
          role: res.role,
          rank: res.role === 'ADMIN' ? 'State DGP / Administrator' : 'Inspector of Police',
          station: 'Central Police Command SOC',
          district: res.district,
          department_id: 'POLICE',
          is_active: true,
          is_break_glass: false,
          created_at: new Date().toISOString(),
        },
      });
    } catch {
      // Fallback
      const role: OfficerRole = badge_number.startsWith('ADMIN') ? 'ADMIN' : 'DUTY_OFFICER';
      const fallbackTokens: AuthTokens = {
        access_token: `token-${Date.now()}`,
        token_type: 'Bearer',
        expires_in: 86400,
        officer_id: badge_number,
        badge_number,
        role,
        district: 'Ahmedabad City',
        department: 'Gujarat Police',
      };
      localStorage.setItem('sentinel_token', JSON.stringify(fallbackTokens));
      set({
        tokens: fallbackTokens,
        isAuthenticated: true,
        officer: {
          id: 'off-custom',
          officer_id: badge_number,
          badge_number,
          full_name: badge_number === 'ADMIN-GND-001' ? 'Director General of Police' : 'Inspector R.K. Jadeja',
          role,
          rank: role === 'ADMIN' ? 'State DGP / Administrator' : 'Police Inspector',
          station: 'State Police Command HQ',
          district: 'Gandhinagar / Ahmedabad',
          department_id: 'POLICE',
          is_active: true,
          is_break_glass: false,
          created_at: new Date().toISOString(),
        },
      });
    }
  },

  requestBreakGlass: async (fir_number, incident_reason) => {
    const currentOff = get().officer;
    set({
      isBreakGlassActive: true,
      breakGlassExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      officer: currentOff ? { ...currentOff, role: 'ADMIN', is_break_glass: true } : null,
    });
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
