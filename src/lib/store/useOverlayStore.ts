import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ChartData } from '@/lib/types';

interface OverlayState {
  overlayData: ChartData | null;
  mainData: ChartData | null;
  mainMicroData: any | null;
  overlayMicroData: any | null;
  selectedChartIdsForOverlay: string[];

  setOverlayData: (data: ChartData | null) => void;
  setMainData: (data: ChartData | null) => void;
  setMainMicroData: (data: any | null) => void;
  setOverlayMicroData: (data: any | null) => void;
  addOverlayChart: (chartId: string) => void;
  removeOverlayChart: (chartId: string) => void;
  clearOverlay: () => void;
}

export const useOverlayStore = create<OverlayState>()(
  immer((set) => ({
    overlayData: null,
    mainData: null,
    mainMicroData: null,
    overlayMicroData: null,
    selectedChartIdsForOverlay: [],

    setOverlayData: (data) => set({ overlayData: data }),
    setMainData: (data) => set({ mainData: data }),
    setMainMicroData: (data) => set({ mainMicroData: data }),
    setOverlayMicroData: (data) => set({ overlayMicroData: data }),

    addOverlayChart: (chartId) => set((state) => {
      if (!state.selectedChartIdsForOverlay.includes(chartId)) {
        state.selectedChartIdsForOverlay.push(chartId);
      }
    }),

    removeOverlayChart: (chartId) => set((state) => {
      state.selectedChartIdsForOverlay = state.selectedChartIdsForOverlay.filter(id => id !== chartId);
    }),

    clearOverlay: () => set({
      overlayData: null,
      mainData: null,
      mainMicroData: null,
      overlayMicroData: null,
      selectedChartIdsForOverlay: [],
    }),
  }))
);