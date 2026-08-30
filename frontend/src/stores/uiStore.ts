import { create } from 'zustand';
import { DepartmentCode } from '../types/camera';

interface UIState {
  sidebarOpen: boolean;
  selectedDepartment: DepartmentCode | 'ALL';
  commandPaletteOpen: boolean;
  section65bModalIncidentId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedDepartment: (dept: DepartmentCode | 'ALL') => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openSection65BModal: (incidentId: string) => void;
  closeSection65BModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedDepartment: 'ALL',
  commandPaletteOpen: false,
  section65bModalIncidentId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  openSection65BModal: (incidentId) => set({ section65bModalIncidentId: incidentId }),
  closeSection65BModal: () => set({ section65bModalIncidentId: null }),
}));
