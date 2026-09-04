import { create } from 'zustand';
import { TrajectoryPoint } from '../core/types/tracking';

export interface SightingNode {
  id: string;
  camera_name: string;
  district: string;
  timestamp: string;
  speed_kmh: number;
  detections: string;
  latitude?: number;
  longitude?: number;
  camera_id?: string;
  pts_ms?: number;
}

export interface ActiveTarget {
  plate: string;
  vehicleCategory: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  firNo: string;
  policeStation: string;
  officerName: string;
  officerBadge: string;
  threatScore: number;
  isWanted: boolean;
  status: 'ACTIVE' | 'CRITICAL_PURSUIT' | 'INTERCEPTED' | 'CASE_REGISTERED';
  sightings: SightingNode[];
  trajectory: TrajectoryPoint[];
}

interface TargetStoreState {
  activeTarget: ActiveTarget;
  setActiveTarget: (target: Partial<ActiveTarget>) => void;
  syncFromCase: (payload: {
    plate: string;
    vehicleCategory: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    firNo: string;
    policeStation: string;
    officerName: string;
    officerBadge: string;
    sightings: SightingNode[];
  }) => void;
  syncFromScan: (plate: string, category: string, sightings: SightingNode[]) => void;
}

const DEFAULT_TARGET: ActiveTarget = {
  plate: '',
  vehicleCategory: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleColor: '',
  firNo: '',
  policeStation: '',
  officerName: '',
  officerBadge: '',
  threatScore: 0,
  isWanted: false,
  status: 'ACTIVE',
  sightings: [],
  trajectory: [],
};

const getStoredTarget = (): ActiveTarget => {
  try {
    const raw = localStorage.getItem('sentinel_active_target');
    return raw ? JSON.parse(raw) : DEFAULT_TARGET;
  } catch {
    return DEFAULT_TARGET;
  }
};

export const useTargetStore = create<TargetStoreState>((set) => ({
  activeTarget: getStoredTarget(),

  setActiveTarget: (target) =>
    set((state) => {
      const updated = { ...state.activeTarget, ...target };
      localStorage.setItem('sentinel_active_target', JSON.stringify(updated));
      return { activeTarget: updated };
    }),

  syncFromCase: (payload) =>
    set((state) => {
      const trajectoryPoints: TrajectoryPoint[] = payload.sightings.map((s, idx) => ({
        camera_id: s.camera_id || `cam0${idx + 1}`,
        camera_name: s.camera_name,
        latitude: s.latitude || 23.0 + idx * 0.04,
        longitude: s.longitude || 72.5 + idx * 0.03,
        sighted_at: s.timestamp.split('(')[0].trim(),
        speed_kmh: s.speed_kmh,
        pts_ms: s.pts_ms || idx * 7000,
      }));

      const updated: ActiveTarget = {
        ...state.activeTarget,
        plate: payload.plate,
        vehicleCategory: payload.vehicleCategory,
        vehicleMake: payload.vehicleMake,
        vehicleModel: payload.vehicleModel,
        vehicleColor: payload.vehicleColor,
        firNo: payload.firNo,
        policeStation: payload.policeStation,
        officerName: payload.officerName,
        officerBadge: payload.officerBadge,
        threatScore: 95,
        isWanted: true,
        status: 'CASE_REGISTERED',
        sightings: payload.sightings,
        trajectory: trajectoryPoints,
      };

      localStorage.setItem('sentinel_active_target', JSON.stringify(updated));
      return { activeTarget: updated };
    }),

  syncFromScan: (plate, category, sightings) =>
    set((state) => {
      const trajectoryPoints: TrajectoryPoint[] = sightings.map((s, idx) => ({
        camera_id: s.camera_id || `cam0${idx + 1}`,
        camera_name: s.camera_name,
        latitude: s.latitude || 23.0 + idx * 0.04,
        longitude: s.longitude || 72.5 + idx * 0.03,
        sighted_at: s.timestamp.split('(')[0].trim(),
        speed_kmh: s.speed_kmh,
        pts_ms: s.pts_ms || idx * 7000,
      }));

      const updated: ActiveTarget = {
        ...state.activeTarget,
        plate,
        vehicleCategory: category,
        threatScore: 90,
        isWanted: true,
        status: 'CRITICAL_PURSUIT',
        sightings,
        trajectory: trajectoryPoints,
      };

      localStorage.setItem('sentinel_active_target', JSON.stringify(updated));
      return { activeTarget: updated };
    }),
}));
