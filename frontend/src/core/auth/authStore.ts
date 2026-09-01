import { create } from 'zustand';
import { OfficerUser, AuthTokens, UserRole } from '../types/auth';

interface AuthState {
  user: OfficerUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  login: (user: OfficerUser, tokens: AuthTokens) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

const getStoredUser = (): OfficerUser | null => {
  try {
    const raw = localStorage.getItem('sentinel_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const defaultOfficer: OfficerUser = {
  id: 'dev-off-01',
  badge_number: 'GJ-POL-8842',
  full_name: 'Inspector R.K. Jadeja',
  role: 'INVESTIGATOR',
  rank: 'Police Inspector (PI)',
  station: 'Navrangpura Police Station',
  district: 'Ahmedabad City',
  email: 'rk.jadeja@gujaratpolice.gov.in',
  is_active: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser() || defaultOfficer,
  tokens: {
    access_token: localStorage.getItem('sentinel_access_token') || 'sentinel-prod-token',
    refresh_token: 'sentinel-refresh-token',
    token_type: 'Bearer',
    expires_in: 28800,
  },
  isAuthenticated: true,

  login: (user, tokens) => {
    localStorage.setItem('sentinel_user', JSON.stringify(user));
    localStorage.setItem('sentinel_access_token', tokens.access_token);
    set({ user, tokens, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('sentinel_user');
    localStorage.removeItem('sentinel_access_token');
    set({ user: null, tokens: null, isAuthenticated: false });
  },

  setRole: (role: UserRole) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, role };
      localStorage.setItem('sentinel_user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));
