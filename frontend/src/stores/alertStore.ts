import { create } from 'zustand';
import { AlertIncident } from '../types/alert';

interface AlertState {
  alerts: AlertIncident[];
  unreadCount: number;
  selectedAlert: AlertIncident | null;
  audioAlertEnabled: boolean;
  setAlerts: (alerts: AlertIncident[]) => void;
  addAlert: (alert: AlertIncident) => void;
  updateAlert: (alert: AlertIncident) => void;
  setSelectedAlert: (alert: AlertIncident | null) => void;
  toggleAudioAlert: () => void;
  clearUnread: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,
  selectedAlert: null,
  audioAlertEnabled: true,

  setAlerts: (alerts) => {
    set({
      alerts,
      unreadCount: alerts.filter((a) => a.status === 'NEW').length,
    });
  },

  addAlert: (alert) => {
    set((state) => {
      // Play tactical audio beep if enabled and critical
      if (state.audioAlertEnabled && alert.severity === 'CRITICAL') {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a1/S9hF01G1iP3fLFmGZELk6P1+3Opm9RLk2N1ezLpG5QLkuM1evJpG1PLUmL1enHpmxNLUiL1ejGpmpM');
          audio.volume = 0.4;
          audio.play().catch(() => {});
        } catch {}
      }

      const updated = [alert, ...state.alerts.filter((a) => a.id !== alert.id)];
      return {
        alerts: updated,
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  updateAlert: (alert) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === alert.id ? alert : a)),
      selectedAlert: state.selectedAlert?.id === alert.id ? alert : state.selectedAlert,
    }));
  },

  setSelectedAlert: (selectedAlert) => set({ selectedAlert }),
  toggleAudioAlert: () => set((state) => ({ audioAlertEnabled: !state.audioAlertEnabled })),
  clearUnread: () => set({ unreadCount: 0 }),
}));
