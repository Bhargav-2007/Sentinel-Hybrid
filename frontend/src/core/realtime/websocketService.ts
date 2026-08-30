import { create } from 'zustand';
import { WS_BASE_URL } from '../api/client';
import { AlertIncident, LiveRealtimeEvent } from '../../shared/types';

interface RealtimeStore {
  events: LiveRealtimeEvent[];
  alerts: AlertIncident[];
  unreadAlertCount: number;
  audioAlertEnabled: boolean;
  addEvent: (event: LiveRealtimeEvent) => void;
  addAlert: (alert: AlertIncident) => void;
  updateAlert: (alert: AlertIncident) => void;
  setAlerts: (alerts: AlertIncident[]) => void;
  toggleAudioAlert: () => void;
  clearUnread: () => void;
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  events: [
    {
      id: 'ev-1',
      timestamp: new Date(Date.now() - 5000).toLocaleTimeString('en-IN', { hour12: false }),
      type: 'ANPR_MATCH',
      title: 'ANPR match / GJ01AB1234 / CAM-042',
      camera_code: 'CAM-042',
      identifier: 'GJ01AB1234',
      severity: 'CRITICAL',
    },
    {
      id: 'ev-2',
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString('en-IN', { hour12: false }),
      type: 'VEHICLE_DETECTED',
      title: 'White SUV detected / CAM-127',
      camera_code: 'CAM-127',
      identifier: 'GJ01AB1234',
      severity: 'HIGH',
    },
    {
      id: 'ev-3',
      timestamp: new Date(Date.now() - 35000).toLocaleTimeString('en-IN', { hour12: false }),
      type: 'CAMERA_DEGRADED',
      title: 'Camera degraded / CAM-019',
      camera_code: 'CAM-019',
      severity: 'MEDIUM',
    },
    {
      id: 'ev-4',
      timestamp: new Date(Date.now() - 55000).toLocaleTimeString('en-IN', { hour12: false }),
      type: 'WATCHLIST_CORRELATION',
      title: 'Watchlist match / HIGH / eGujCop Stolen Auto',
      camera_code: 'CAM-008',
      identifier: 'GJ05CD5678',
      severity: 'HIGH',
    },
  ],
  alerts: [],
  unreadAlertCount: 0,
  audioAlertEnabled: true,

  addEvent: (event) => set((state) => ({
    events: [event, ...state.events.slice(0, 49)],
  })),

  addAlert: (alert) => set((state) => {
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
      unreadAlertCount: state.unreadAlertCount + 1,
    };
  }),

  updateAlert: (alert) => set((state) => ({
    alerts: state.alerts.map((a) => (a.id === alert.id ? alert : a)),
  })),

  setAlerts: (alerts) => set({
    alerts,
    unreadAlertCount: alerts.filter((a) => a.status === 'NEW').length,
  }),

  toggleAudioAlert: () => set((state) => ({ audioAlertEnabled: !state.audioAlertEnabled })),
  clearUnread: () => set({ unreadAlertCount: 0 }),
}));

class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectInterval = 3000;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    try {
      this.socket = new WebSocket(WS_BASE_URL);

      this.socket.onopen = () => {
        console.log('✅ Sentinel OS WebSocket Connected to', WS_BASE_URL);
      };

      this.socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'alert_created' && data.payload) {
            useRealtimeStore.getState().addAlert(data.payload);
            useRealtimeStore.getState().addEvent({
              id: `ev-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
              type: 'ALERT_CREATED',
              title: `${data.payload.title} (${data.payload.detected_plate || data.payload.incident_number})`,
              camera_code: data.payload.camera_name || 'CAM-NODE',
              identifier: data.payload.detected_plate,
              severity: data.payload.severity,
            });
          }
        } catch {}
      };

      this.socket.onclose = () => {
        setTimeout(() => this.connect(), this.reconnectInterval);
      };
    } catch {
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const websocketManager = new WebSocketManager();
