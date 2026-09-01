import { create } from 'zustand';
import { CameraNode } from '../core/types/camera';
import { ThreatAlert } from '../core/types/alert';
import { LiveDetectionEvent } from '../core/types/detection';

interface UIState {
  // Video Matrix Grid layout
  gridMode: '2x2' | '3x3' | '4x4' | 'all30';
  setGridMode: (mode: '2x2' | '3x3' | '4x4' | 'all30') => void;

  // Selected camera for 360 Inspection modal / stream
  selectedCamera: CameraNode | null;
  setSelectedCamera: (camera: CameraNode | null) => void;

  // Context Panel Drawer
  isContextDrawerOpen: boolean;
  contextData: {
    detection?: LiveDetectionEvent;
    alert?: ThreatAlert;
    camera?: CameraNode;
    plate?: string;
  } | null;
  openContextDrawer: (data: UIState['contextData']) => void;
  closeContextDrawer: () => void;

  // Audio Alerts
  audioAlertsEnabled: boolean;
  toggleAudioAlerts: () => void;

  // Stream Protocol Preference
  streamProtocol: 'hls' | 'webrtc' | 'rtsp';
  setStreamProtocol: (proto: 'hls' | 'webrtc' | 'rtsp') => void;
}

export const useUIStore = create<UIState>((set) => ({
  gridMode: 'all30',
  setGridMode: (mode) => set({ gridMode: mode }),

  selectedCamera: null,
  setSelectedCamera: (camera) => set({ selectedCamera: camera }),

  isContextDrawerOpen: false,
  contextData: null,
  openContextDrawer: (data) => set({ isContextDrawerOpen: true, contextData: data }),
  closeContextDrawer: () => set({ isContextDrawerOpen: false, contextData: null }),

  audioAlertsEnabled: true,
  toggleAudioAlerts: () => set((state) => ({ audioAlertsEnabled: !state.audioAlertsEnabled })),

  streamProtocol: 'hls',
  setStreamProtocol: (streamProtocol) => set({ streamProtocol }),
}));
