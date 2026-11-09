import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  ChartData,
  ToothMeasurement,
  ToothClinicalData,
  ActiveIndices,
  ViewStatus,
  SurfaceId,
  FDIToothNumber,
  CHART_TEMPLATE,
  ALL_TEETH,
  calculateAL,
  DEFAULT_ACTIVE_INDICES,
} from '@/lib/types';
import { buildChartDataFromStudy } from '@/lib/utils/studyToChart';
import {
  calculateChartStatistics,
  ChartIndexSummary,
  EMPTY_INDEX_SUMMARY,
  isToothPresent,
} from '@/lib/utils/periodontalAnalysis';
import { getApplicableSurfaces } from '@/lib/utils/chartGeometry';
import { getTableSiteSurfaces } from '@/lib/constants/surfaces';

interface ChartState {
  chartData: ChartData;
  toothMeasurements: ToothMeasurement[];
  deletedRowsStack: { row: ToothMeasurement; index: number }[];

  viewStatus: ViewStatus;
  isGmInverted: boolean;
  isMirrored: boolean;
  activeIndices: ActiveIndices;
  activeRemoteControl: string;
  isOverlayMode: boolean;

  hasClinicalData: boolean;
  isDirty: boolean;

  setChartData: (data: Partial<ChartData>) => void;
  updateField: (key: string, value: any) => void;
  updateToothMeasurement: (index: number, field: string, value: any) => void;
  deleteToothRow: (index: number) => void;
  restoreLastDeletedRow: () => void;
  setViewStatus: (status: ViewStatus) => void;
  toggleGmInverted: () => void;
  toggleMirrored: () => void;
  setActiveIndices: (indices: Partial<ActiveIndices>) => void;
  setActiveRemoteControl: (mode: string) => void;
  setOverlayMode: (enabled: boolean) => void;
  calculateAllAL: () => void;
  calculateAL: () => void;
  calculateIndices: () => ChartIndexSummary;
  collectDataAsJson: () => ChartData;
  reset: () => void;
  markDirty: (dirty: boolean) => void;
  initializeFromPatient: (patientId: string, patientName: string) => void;
  loadFromApiData: (apiData: any) => void;
  prepareApiPayload: () => any;
  handleToothSurfaceClick: (tooth: number, surfaceId: string, type: 'bop' | 'pi', value: boolean) => void;
  toggleToothIndex: (tooth: number, type: 'bop' | 'pi') => void;
  updateToothSurface: (tooth: number, surface: SurfaceId, field: string, value: any) => void;
  toggleBop: (tooth: number, surface: SurfaceId) => void;
  togglePlaque: (tooth: number, surface: SurfaceId) => void;
  toggleToothPresence: (tooth: number) => void;
  cycleImplantStatus: (tooth: number) => void;
  setFurcation: (tooth: number, site: string, grade: number) => void;
  setMobility: (tooth: number, grade: number) => void;
}

const INDEX_SURFACES: SurfaceId[] = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];

const initialToothMeasurements: ToothMeasurement[] = ALL_TEETH.map(tooth => ({
  diente: String(tooth),
  vestibular: { mesial: '', medio: '', distal: '' },
  palatino: { mesial: '', medio: '', distal: '' },
  movilidad: '0',
  sangrado: false,
  placa: false,
  observaciones: '',
}));

const initialState: ChartState = {
  chartData: CHART_TEMPLATE,
  toothMeasurements: initialToothMeasurements,
  deletedRowsStack: [],
  
  viewStatus: 2,
  isGmInverted: true,
  isMirrored: false,
  activeIndices: DEFAULT_ACTIVE_INDICES,
  activeRemoteControl: 'pockets',
  isOverlayMode: false,

  hasClinicalData: false,
  isDirty: false,

  setChartData: () => {},
  updateField: () => {},
  updateToothMeasurement: () => {},
  deleteToothRow: () => {},
  restoreLastDeletedRow: () => {},
  setViewStatus: () => {},
  toggleGmInverted: () => {},
  toggleMirrored: () => {},
  setActiveIndices: () => {},
  setActiveRemoteControl: () => {},
  setOverlayMode: () => {},
  calculateAllAL: () => {},
  calculateAL: () => {},
  calculateIndices: () => EMPTY_INDEX_SUMMARY,
  collectDataAsJson: () => CHART_TEMPLATE,
  reset: () => {},
  markDirty: () => {},
  initializeFromPatient: () => {},
  loadFromApiData: () => {},
  prepareApiPayload: () => ({}),
  handleToothSurfaceClick: () => {},
  toggleToothIndex: () => {},
  updateToothSurface: () => {},
  toggleBop: () => {},
  togglePlaque: () => {},
  toggleToothPresence: () => {},
  cycleImplantStatus: () => {},
  setFurcation: () => {},
  setMobility: () => {},
};

export const useChartStore = create<ChartState>()(
  immer((set, get) => ({
    ...initialState,

    setChartData: (newData) => set((state) => {
      Object.assign(state.chartData, newData);
      state.isDirty = true;
    }),


    updateField: (key, value) => {
      set((state) => {
        if (key.includes('.')) {
          const parts = key.split('.');
          let target = state.chartData as Record<string, any>;
          for (let i = 0; i < parts.length - 1; i++) {
            if (typeof target[parts[i]] !== 'object' || target[parts[i]] === null) {
              target[parts[i]] = {};
            }
            target = target[parts[i]];
          }
          target[parts[parts.length - 1]] = value;
        } else {
          state.chartData[key] = value;
        }
        state.isDirty = true;
      });

      if (key.startsWith('pd_') || key.startsWith('gm_')) {
        get().calculateAllAL();
      }
      if (key.startsWith('pi_') || key.startsWith('bop_')) {
        get().calculateIndices();
      }
    },

    updateToothMeasurement: (index, field, value) => set((state) => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const parentKey = parent as keyof ToothMeasurement;
        const currentValue = state.toothMeasurements[index][parentKey];

        if (typeof currentValue === 'object' && currentValue !== null) {
          state.toothMeasurements[index] = {
            ...state.toothMeasurements[index],
            [parentKey]: { ...currentValue, [child]: value },
          };
        }
      } else {
        state.toothMeasurements[index] = {
          ...state.toothMeasurements[index],
          [field]: value,
        };
      }
      state.isDirty = true;
    }),

    deleteToothRow: (index) => set((state) => {
      const row = state.toothMeasurements[index];
      state.deletedRowsStack.push({ row, index });
      state.toothMeasurements = state.toothMeasurements.filter((_, i) => i !== index);
      state.isDirty = true;
    }),

    restoreLastDeletedRow: () => set((state) => {
      if (state.deletedRowsStack.length > 0) {
        const { row, index } = state.deletedRowsStack[state.deletedRowsStack.length - 1];
        const updated = [...state.toothMeasurements];
        updated.splice(index, 0, row);
        state.toothMeasurements = updated;
        state.deletedRowsStack = state.deletedRowsStack.slice(0, -1);
        state.isDirty = true;
      }
    }),

    setViewStatus: (status) => set((state) => {
      state.viewStatus = status;
      state.chartData.viewStatus = status;
    }),

    toggleGmInverted: () => {
      set((state) => {
        state.isGmInverted = !state.isGmInverted;
        state.chartData.isGmInverted = state.isGmInverted;
      });
      get().calculateAllAL();
    },

    toggleMirrored: () => set((state) => {
      state.isMirrored = !state.isMirrored;
      state.chartData.isMirrored = state.isMirrored;
    }),

    setActiveIndices: (indices) => set((state) => {
      state.activeIndices = { ...state.activeIndices, ...indices };
      state.chartData.active_indices = state.activeIndices;
    }),

    setActiveRemoteControl: (mode) => set((state) => {
      state.activeRemoteControl = mode;
    }),

    setOverlayMode: (enabled) => set((state) => {
      state.isOverlayMode = enabled;
    }),

    calculateAllAL: () => set((state) => {
      const isInverted = state.isGmInverted;
      const surfaces: SurfaceId[] = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];

      ALL_TEETH.forEach(tooth => {
        surfaces.forEach(surface => {
          const pdKey = `pd_${tooth}_${surface}`;
          const gmKey = `gm_${tooth}_${surface}`;
          const alKey = `al_${tooth}_${surface}`;

          const pd = parseFloat(state.chartData[pdKey]) || 0;
          const gm = parseFloat(state.chartData[gmKey]) || 0;

          state.chartData[alKey] = calculateAL(pd, gm, isInverted);
        });
      });
    }),

    calculateAL: () => get().calculateAllAL(),

    calculateIndices: () => {
      const stats = calculateChartStatistics(get().chartData);

      set((state) => {
        state.chartData.indice_placa = Number(stats.plaquePercent.toFixed(1));
        state.chartData.indice_sangrado = Number(stats.bopPercent.toFixed(1));
      });

      return {
        bopPercent: stats.bopPercent,
        plaquePercent: stats.plaquePercent,
        meanPd: stats.meanPd,
        meanAl: stats.meanAl,
      };
    },

    collectDataAsJson: () => {
      const state = get();
      return {
        ...state.chartData,
        viewStatus: state.viewStatus,
        isGmInverted: state.isGmInverted,
        isMirrored: state.isMirrored,
        active_indices: state.activeIndices,
      };
    },

    reset: () => set(initialState),

    markDirty: (dirty) => set((state) => {
      state.isDirty = dirty;
    }),

    initializeFromPatient: (patientId, patientName) => {
      const initialChartData: ChartData = { ...CHART_TEMPLATE };
      ALL_TEETH.forEach(tooth => {
        initialChartData[`tooth_${tooth}`] = '1';
        const surfaces = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'] as const;
        surfaces.forEach(surf => {
          initialChartData[`pd_${tooth}_${surf}`] = 0;
          initialChartData[`gm_${tooth}_${surf}`] = 0;
          initialChartData[`bop_${tooth}_${surf}`] = '0';
          initialChartData[`pi_${tooth}_${surf}`] = '0';
        });
        initialChartData[`mobility_${tooth}`] = 0;
        initialChartData[`implant_${tooth}`] = 0;
        initialChartData[`note_${tooth}`] = '';
      });

      set((state) => {
        state.chartData = {
          ...initialChartData,
          patient_number: patientId,
          patient_first_name: patientName.split(' ')[0] || '',
          patient_last_name: patientName.split(' ').slice(1).join(' ') || '',
          date: new Date().toISOString().split('T')[0],
          date_saved: new Date().toISOString(),
          clinician: '',
          doctor_id: '',
          indice_placa: 0,
          indice_sangrado: 0,
          nivel_insercion_clinica: '',
          furcaciones: 'no-evaluado',
          observaciones_generales: '',
          plan_tratamiento: {},
        };
        state.toothMeasurements = initialToothMeasurements.map(tm => ({
          ...tm,
          vestibular: { ...tm.vestibular },
          palatino: { ...tm.palatino },
        }));
        state.deletedRowsStack = [];
        state.hasClinicalData = false;
        state.isDirty = false;
      });

      get().calculateAllAL();
    },

    loadFromApiData: (apiData) => set((state) => {
      if (!apiData) return;

      const loadedChartData: ChartData = {
        ...buildChartDataFromStudy(apiData),
        viewStatus: state.viewStatus,
        isGmInverted: state.isGmInverted,
        isMirrored: state.isMirrored,
        active_indices: state.activeIndices,
      };

      const mediciones = Array.isArray(apiData.mediciones)
        ? apiData.mediciones
        : Array.isArray(apiData.mediciones_periodontales)
          ? apiData.mediciones_periodontales
          : [];

      if (mediciones.length > 0) {
        state.toothMeasurements = mediciones.map((m: any) => ({
          diente: m.numero_diente || m.diente,
          vestibular: {
            mesial: m.vestibular_mesial?.toString() || m.vestibular?.mesial?.toString() || '',
            medio: m.vestibular_medio?.toString() || m.vestibular?.medio?.toString() || '',
            distal: m.vestibular_distal?.toString() || m.vestibular?.distal?.toString() || '',
          },
          palatino: {
            mesial: m.palatino_mesial?.toString() || m.palatino?.mesial?.toString() || '',
            medio: m.palatino_medio?.toString() || m.palatino?.medio?.toString() || '',
            distal: m.palatino_distal?.toString() || m.palatino?.distal?.toString() || '',
          },
          movilidad: (m.movilidad || '0').toString(),
          sangrado: m.sangrado || false,
          placa: m.placa || false,
          observaciones: m.observaciones_diente || m.observaciones || '',
        }));
      }

      state.chartData = loadedChartData;

      state.hasClinicalData = true;
      state.isDirty = false;
    }),

    prepareApiPayload: () => {
      const state = get();
      const chart = state.chartData;

      const toNumber = (value: unknown): number | null => {
        const parsed = parseFloat(String(value));
        if (!Number.isFinite(parsed)) return null;
        return parsed >= 0 && parsed <= 20 ? parsed : null;
      };

      const mediciones = ALL_TEETH.filter(tooth =>
        isToothPresent(chart, tooth as FDIToothNumber),
      ).map(tooth => {
        const { vestibular, palatino } = getTableSiteSurfaces(tooth);
        const vestibularValues = [vestibular[0], vestibular[1], vestibular[2]];
        const palatinoValues = [palatino[0], palatino[1], palatino[2]];

        const siteValue = (surface: SurfaceId) => {
          const raw = chart[`pd_${tooth}_${surface}`];
          if (raw === undefined || raw === null || raw === '') return null;
          return toNumber(raw);
        };

        const anyFlag = (prefix: string) =>
          getApplicableSurfaces(tooth).some(surface => {
            const value = chart[`${prefix}_${tooth}_${surface}`];
            return value === '1' || value === 1 || value === true;
          });

        return {
          diente: String(tooth),
          vestibular: {
            mesial: siteValue(vestibularValues[0]),
            medio: siteValue(vestibularValues[1]),
            distal: siteValue(vestibularValues[2]),
          },
          palatino: {
            mesial: siteValue(palatinoValues[0]),
            medio: siteValue(palatinoValues[1]),
            distal: siteValue(palatinoValues[2]),
          },
          movilidad: parseInt(String(chart[`mobility_${tooth}`])) || 0,
          sangrado: anyFlag('bop'),
          placa: anyFlag('pi'),
          observaciones: chart[`note_${tooth}`] || '',
        };
      });

      const indicePlaca = parseFloat(String(chart.indice_placa));
      const indiceSangrado = parseFloat(String(chart.indice_sangrado));
      const clampIndex = (value: number) => Math.min(100, Math.max(0, value));
      const furcaciones = ['no-evaluado', 'grado1', 'grado2', 'grado3'].includes(chart.furcaciones)
        ? chart.furcaciones
        : 'no-evaluado';

      return {
        paciente_id: chart.patient_number,
        doctor_id: chart.doctor_id || null,
        fecha_estudio: chart.date,
        indice_placa: Number.isFinite(indicePlaca) ? clampIndex(indicePlaca) : null,
        indice_sangrado: Number.isFinite(indiceSangrado) ? clampIndex(indiceSangrado) : null,
        nivel_insercion_clinica: chart.nivel_insercion_clinica || null,
        furcaciones,
        observaciones_generales: chart.observaciones_generales || null,
        plan_tratamiento: chart.plan_tratamiento || {},
        mediciones,
      };
    },

    handleToothSurfaceClick: (tooth: number, surfaceId: string, type: 'bop' | 'pi', value: boolean) => {
      set((state) => {
        getApplicableSurfaces(tooth as FDIToothNumber).forEach(surface => {
          state.chartData[`${type}_${tooth}_${surface}`] = value ? '1' : '0';
        });
        state.isDirty = true;

        const toothIndex = state.toothMeasurements.findIndex(tm => parseInt(tm.diente, 10) === tooth);
        if (toothIndex !== -1) {
          if (type === 'bop') {
            state.toothMeasurements[toothIndex].sangrado = value;
          } else {
            state.toothMeasurements[toothIndex].placa = value;
          }
        }
      });

      get().calculateIndices();
    },

    toggleToothIndex: (tooth: number, type: 'bop' | 'pi') => {
      const current = INDEX_SURFACES.some(surface => {
        const value = get().chartData[`${type}_${tooth}_${surface}`];
        return value === '1' || value === 1;
      });
      get().handleToothSurfaceClick(tooth, 'b', type, !current);
    },

    updateToothSurface: (tooth: number, surface: SurfaceId, field: string, value: any) => {
      get().updateField(`${field}_${tooth}_${surface}`, value);
    },

    toggleBop: (tooth: number, surface: SurfaceId) => {
      const key = `bop_${tooth}_${surface}`;
      const current = get().chartData[key] === '1' || get().chartData[key] === 1;

      set((state) => {
        state.chartData[key] = current ? '0' : '1';
        state.isDirty = true;
      });

      get().calculateIndices();
    },

    togglePlaque: (tooth: number, surface: SurfaceId) => {
      const key = `pi_${tooth}_${surface}`;
      const current = get().chartData[key] === '1' || get().chartData[key] === 1;

      set((state) => {
        state.chartData[key] = current ? '0' : '1';
        state.isDirty = true;
      });

      get().calculateIndices();
    },

    toggleToothPresence: (tooth: number) => {
      const key = `tooth_${tooth}`;
      const present = isToothPresent(get().chartData, tooth as FDIToothNumber);

      set((state) => {
        state.chartData[key] = present ? '0' : '1';

        if (present) {
          INDEX_SURFACES.forEach(surface => {
            state.chartData[`pd_${tooth}_${surface}`] = 0;
            state.chartData[`gm_${tooth}_${surface}`] = 0;
            state.chartData[`al_${tooth}_${surface}`] = 0;
            state.chartData[`bop_${tooth}_${surface}`] = '0';
            state.chartData[`pi_${tooth}_${surface}`] = '0';
          });
          state.chartData[`mobility_${tooth}`] = 0;
          state.chartData[`implant_${tooth}`] = 0;
          state.chartData[`note_${tooth}`] = '';
        }

        state.isDirty = true;
      });

      get().calculateAllAL();
      get().calculateIndices();
    },

    cycleImplantStatus: (tooth: number) => {
      const current = parseInt(get().chartData[`implant_${tooth}`], 10) || 0;
      const next = (current + 1) % 4;

      set((state) => {
        state.chartData[`implant_${tooth}`] = next;
        state.isDirty = true;
      });
    },

    setFurcation: (tooth: number, site: string, grade: number) => {
      set((state) => {
        state.chartData[`furcation_${tooth}_${site}`] = grade;
        state.isDirty = true;
      });
    },

    setMobility: (tooth: number, grade: number) => {
      set((state) => {
        state.chartData[`mobility_${tooth}`] = grade;
        state.isDirty = true;
      });
    },
  }))
);