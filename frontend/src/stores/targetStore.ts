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
  plate: 'GJ 01 AB 1234',
  vehicleCategory: 'Car',
  vehicleMake: 'Toyota',
  vehicleModel: 'Fortuner 4x4',
  vehicleColor: 'White',
  firNo: 'FIR-2026-CR-08942',
  policeStation: 'Navrangpura Police Station, Ahmedabad',
  officerName: 'Inspector R.K. Jadeja',
  officerBadge: 'GJ-POL-8842',
  threatScore: 95,
  isWanted: true,
  status: 'CRITICAL_PURSUIT',
  sightings: [
    {
      id: '1',
      camera_id: 'cam07',
      camera_name: 'Sarkhej Sanand Cross Roads (CAM07)',
      district: 'Ahmedabad City',
      timestamp: '05:10:00 UTC (1000ms PTS)',
      speed_kmh: 42.0,
      detections: 'Car [GJ01AB1234], Person (2)',
      latitude: 22.9868,
      longitude: 72.4965,
      pts_ms: 1000,
    },
    {
      id: '2',
      camera_id: 'cam01',
      camera_name: 'SG Highway Iskcon Jct (CAM01)',
      district: 'Ahmedabad City',
      timestamp: '05:18:00 UTC (8000ms PTS)',
      speed_kmh: 68.2,
      detections: 'Car [GJ01AB1234]',
      latitude: 23.0298,
      longitude: 72.5074,
      pts_ms: 8000,
    },
    {
      id: '3',
      camera_id: 'cam08',
      camera_name: 'C.G. Road Swastik Crossroad (CAM08)',
      district: 'Ahmedabad City',
      timestamp: '05:25:00 UTC (15000ms PTS)',
      speed_kmh: 35.0,
      detections: 'Car [GJ01AB1234], Auto (1)',
      latitude: 23.0338,
      longitude: 72.5562,
      pts_ms: 15000,
    },
    {
      id: '4',
      camera_id: 'cam04',
      camera_name: 'Sector 10 Secretariat (CAM04)',
      district: 'Gandhinagar',
      timestamp: '05:32:00 UTC (22000ms PTS)',
      speed_kmh: 64.0,
      detections: 'Car [GJ01AB1234], Bus (1)',
      latitude: 23.2156,
      longitude: 72.6369,
      pts_ms: 22000,
    },
  ],
  trajectory: [
    { camera_id: 'cam07', camera_name: 'Sarkhej Sanand Cross Roads', latitude: 22.9868, longitude: 72.4965, sighted_at: '05:10:00 UTC', speed_kmh: 42.0, pts_ms: 1000 },
    { camera_id: 'cam01', camera_name: 'SG Highway Iskcon Jct', latitude: 23.0298, longitude: 72.5074, sighted_at: '05:18:00 UTC', speed_kmh: 68.2, pts_ms: 8000 },
    { camera_id: 'cam08', camera_name: 'C.G. Road Swastik Crossroad', latitude: 23.0338, longitude: 72.5562, sighted_at: '05:25:00 UTC', speed_kmh: 35.0, pts_ms: 15000 },
    { camera_id: 'cam04', camera_name: 'Sector 10 Secretariat', latitude: 23.2156, longitude: 72.6369, sighted_at: '05:32:00 UTC', speed_kmh: 64.0, pts_ms: 22000 },
  ],
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
