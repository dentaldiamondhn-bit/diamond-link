import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ContainerView, RemoteControlMode, UIState } from '@/lib/types';

interface UIStateExtended extends UIState {
  setActiveContainer: (container: ContainerView) => void;
  setActiveRemoteControl: (mode: RemoteControlMode) => void;
  setNavigationHidden: (hidden: boolean) => void;
  setSortDirection: (direction: UIState['sortDirection']) => void;
}

const initialUIState: UIState = {
  activeRemoteControl: 'bop',
  activeContainer: 'main-chart-container',
  navigationHidden: false,
  sortDirection: 'date_desc',
  activePatientId: null,
  activeChartId: null,
  latestChartId: null,
  overlayData: null,
  mainData: null,
  mainMicroData: null,
  overlayMicroData: null,
  selectedChartIdsForOverlay: [],
  currentLoadedData: null,
  lastSavedPerioData: null,
  micMode: 'live',
  micTranscript: '',
  micTraining: {},
  openModals: [],
  toasts: [],
};

export const useUIStore = create<UIStateExtended>()(
  immer((set) => ({
    ...initialUIState,

    setActiveContainer: (container) => set((state) => {
      state.activeContainer = container;
    }),

    setActiveRemoteControl: (mode) => set((state) => {
      state.activeRemoteControl = mode;
    }),

    setNavigationHidden: (hidden) => set((state) => {
      state.navigationHidden = hidden;
    }),

    setSortDirection: (direction) => set((state) => {
      state.sortDirection = direction;
    }),
  }))
);