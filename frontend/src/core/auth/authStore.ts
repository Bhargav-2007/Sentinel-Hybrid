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

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('sentinel_access_token');
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  tokens: getStoredToken()
    ? {
        access_token: getStoredToken()!,
        refresh_token: 'sentinel-refresh-token',
        token_type: 'Bearer',
        expires_in: 28800,
      }
    : null,
  isAuthenticated: !!getStoredToken(),

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
