import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Patient, Chart, AppData, UserSettings, LanguageCode } from '@/lib/types';
import { useSettingsStore } from './useSettingsStore';

const STORAGE_KEY = 'parodontalstatus_data';

interface PatientState {
  patients: Patient[];
  activePatientId: string | null;
  activeChartId: string | null;
  latestChartId: string | null;

  loadFromStorage: () => void;
  saveToStorage: () => void;
  savePatient: (patient: Patient) => void;
  deletePatient: (patientId: string) => void;
  reorderPatients: (oldIndex: number, newIndex: number) => void;
  getPatient: (patientId: string) => Patient | undefined;
  addChartToPatient: (patientId: string, chart: Chart) => Chart | null;
  updateChart: (patientId: string, chart: Chart) => boolean;
  deleteChart: (patientId: string, chartId: string) => boolean;
  setActivePatient: (patientId: string | null) => void;
  setActiveChart: (chartId: string | null) => void;
  generateUUID: () => string;
}

function isQuotaExceeded(e: unknown): boolean {
  if (e instanceof DOMException) {
    return e.name === 'QuotaExceededError' || e.code === 22;
  }
  return false;
}

function showStorageFullDialog() {
  if (typeof window !== 'undefined') {
    alert('Browser storage is full. Please export your data and delete old records.');
  }
}

export const usePatientStore = create<PatientState>()(
  immer((set, get) => ({
    patients: [],
    activePatientId: null,
    activeChartId: null,
    latestChartId: null,

    loadFromStorage: () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: AppData = JSON.parse(stored);
          set({ patients: data.patients || [] });
        }
      } catch (e) {
        console.error('Failed to load patient data', e);
      }
    },

    saveToStorage: () => {
      try {
        const data: AppData = {
          patients: get().patients,
          settings: useSettingsStore.getState().settings,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        if (isQuotaExceeded(e)) {
          showStorageFullDialog();
        }
        throw e;
      }
    },

    savePatient: (patient) => set((state) => {
      const index = state.patients.findIndex(p => p.id === patient.id);
      if (index >= 0) {
        state.patients[index] = { ...state.patients[index], ...patient };
      } else {
        state.patients.push(patient);
      }
      get().saveToStorage();
    }),

    deletePatient: (patientId) => set((state) => {
      state.patients = state.patients.filter(p => p.id !== patientId);
      if (state.activePatientId === patientId) {
        state.activePatientId = null;
        state.activeChartId = null;
      }
      get().saveToStorage();
    }),

    reorderPatients: (oldIndex, newIndex) => set((state) => {
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const patients = state.patients;
      if (oldIndex >= patients.length || newIndex >= patients.length) return;
      const [moved] = patients.splice(oldIndex, 1);
      patients.splice(newIndex, 0, moved);
      get().saveToStorage();
    }),

    getPatient: (patientId) => get().patients.find(p => p.id === patientId),

    addChartToPatient: (patientId, chart) => {
      const patient = get().getPatient(patientId);
      if (!patient) return null;

      const newChart = {
        ...chart,
        id: chart.id || get().generateUUID(),
        created_at: chart.created_at || new Date().toISOString(),
      };

      set((state) => {
        const p = state.patients.find(p => p.id === patientId);
        if (p) {
          p.charts = p.charts || [];
          p.charts.unshift(newChart);
        }
      });

      get().saveToStorage();
      return newChart;
    },

    updateChart: (patientId, chart) => {
      const patient = get().getPatient(patientId);
      if (!patient || !patient.charts) return false;

      const index = patient.charts.findIndex(c => c.id === chart.id);
      if (index >= 0) {
        set((state) => {
          const p = state.patients.find(p => p.id === patientId);
          if (p) p.charts[index] = chart;
        });
        get().saveToStorage();
        return true;
      }
      return false;
    },

    deleteChart: (patientId, chartId) => {
      const patient = get().getPatient(patientId);
      if (!patient || !patient.charts) return false;

      const initialLength = patient.charts.length;
      set((state) => {
        const p = state.patients.find(p => p.id === patientId);
        if (p) p.charts = p.charts.filter(c => c.id !== chartId);
      });

      if (patient.charts.length < initialLength) {
        get().saveToStorage();
        return true;
      }
      return false;
    },

    setActivePatient: (patientId) => set({ activePatientId: patientId }),
    setActiveChart: (chartId) => set({ activeChartId: chartId, latestChartId: chartId }),
    generateUUID: () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
  }))
);