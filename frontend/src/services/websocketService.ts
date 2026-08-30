import { WS_BASE_URL } from './api';
import { useAlertStore } from '../stores/alertStore';
import { AlertIncident } from '../types/alert';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 3000;
  private isConnecting = false;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return;

    this.isConnecting = true;

    try {
      this.socket = new WebSocket(WS_BASE_URL);

      this.socket.onopen = () => {
        console.log('✅ Real-time Gujarat Sentinel WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (err) {
          console.warn('Malformed WS message:', event.data);
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
        this.socket?.close();
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleEvent(data: any) {
    if (data.type === 'alert_created' && data.payload) {
      useAlertStore.getState().addAlert(data.payload as AlertIncident);
    } else if (data.type === 'alert_updated' && data.payload) {
      useAlertStore.getState().updateAlert(data.payload as AlertIncident);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
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

export const websocketService = new WebSocketService();
