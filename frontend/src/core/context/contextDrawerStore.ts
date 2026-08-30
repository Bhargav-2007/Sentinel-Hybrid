import { create } from 'zustand';
import { Camera, AlertIncident, Vehicle360Profile } from '../../shared/types';

export type ContextDrawerType = 'CAMERA' | 'VEHICLE' | 'ALERT' | 'INCIDENT' | 'EVIDENCE' | null;

interface ContextDrawerState {
  isOpen: boolean;
  type: ContextDrawerType;
  selectedCamera: Camera | null;
  selectedAlert: AlertIncident | null;
  selectedPlate: string | null;
  selectedIncidentId: string | null;
  
  openCameraDrawer: (camera: Camera) => void;
  openVehicleDrawer: (plate: string) => void;
  openAlertDrawer: (alert: AlertIncident) => void;
  openIncidentDrawer: (incidentId: string) => void;
  closeDrawer: () => void;
}

export const useContextDrawerStore = create<ContextDrawerState>((set) => ({
  isOpen: false,
  type: null,
  selectedCamera: null,
  selectedAlert: null,
  selectedPlate: null,
  selectedIncidentId: null,

  openCameraDrawer: (camera) => set({
    isOpen: true,
    type: 'CAMERA',
    selectedCamera: camera,
    selectedAlert: null,
    selectedPlate: null,
    selectedIncidentId: null,
  }),

  openVehicleDrawer: (plate) => set({
    isOpen: true,
    type: 'VEHICLE',
    selectedPlate: plate,
    selectedCamera: null,
    selectedAlert: null,
    selectedIncidentId: null,
  }),

  openAlertDrawer: (alert) => set({
    isOpen: true,
    type: 'ALERT',
    selectedAlert: alert,
    selectedCamera: null,
    selectedPlate: null,
    selectedIncidentId: null,
  }),

  openIncidentDrawer: (incidentId) => set({
    isOpen: true,
    type: 'INCIDENT',
    selectedIncidentId: incidentId,
    selectedCamera: null,
    selectedAlert: null,
    selectedPlate: null,
  }),

  closeDrawer: () => set({
    isOpen: false,
    type: null,
    selectedCamera: null,
    selectedAlert: null,
    selectedPlate: null,
    selectedIncidentId: null,
  }),
}));
