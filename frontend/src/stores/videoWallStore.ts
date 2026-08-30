import { create } from 'zustand';
import { Camera } from '../types/camera';

export type VideoGridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '1+5' | '1+7';

interface VideoWallState {
  layout: VideoGridLayout;
  slotAssignments: Record<number, string>; // slotIndex -> cameraId
  selectedSlotIndex: number;
  selectedCamera: Camera | null;
  hudEnabled: boolean;
  ptzControlOpen: boolean;
  setLayout: (layout: VideoGridLayout) => void;
  assignCameraToSlot: (slotIndex: number, cameraId: string) => void;
  setSelectedSlotIndex: (index: number) => void;
  setSelectedCamera: (camera: Camera | null) => void;
  toggleHud: () => void;
  togglePtzControl: () => void;
}

export const useVideoWallStore = create<VideoWallState>((set) => ({
  layout: '2x2',
  slotAssignments: {
    0: '1',
    1: '2',
    2: '3',
    3: '4',
  },
  selectedSlotIndex: 0,
  selectedCamera: null,
  hudEnabled: true,
  ptzControlOpen: false,

  setLayout: (layout) => set({ layout }),
  assignCameraToSlot: (slotIndex, cameraId) =>
    set((state) => ({
      slotAssignments: { ...state.slotAssignments, [slotIndex]: cameraId },
    })),
  setSelectedSlotIndex: (selectedSlotIndex) => set({ selectedSlotIndex }),
  setSelectedCamera: (selectedCamera) => set({ selectedCamera }),
  toggleHud: () => set((state) => ({ hudEnabled: !state.hudEnabled })),
  togglePtzControl: () => set((state) => ({ ptzControlOpen: !state.ptzControlOpen })),
}));
