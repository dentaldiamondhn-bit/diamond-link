# Periodontal Chart Application - Implementation Specification

## Overview

This document provides a complete setup and implementation specification for rebuilding the periodontal chart application (https://www.periodontalchart-online.com/?lang=es) using **Next.js 14+ (App Router) + Tailwind CSS + React 18+** with a modern React state architecture.

Based on reverse-engineering analysis of the target application, this specification covers:
- UI layout hierarchy and component structure
- Clinical data model and state management
- Rendering architecture (SVG-based periodontal charts)
- Clinical workflow and user interactions
- Persistence layer (LocalStorage → adaptable to backend)

---

## 1. Technology Stack

```json
{
  "framework": "Next.js 14+ (App Router)",
  "language": "TypeScript 5+",
  "styling": "Tailwind CSS 3.4+",
  "state": "Zustand 4+ (global) + React Context (local)",
  "forms": "React Hook Form 7+ + Zod 3+",
  "svg": "Inline SVG + D3-scale (for coordinate mapping)",
  "persistence": "LocalStorage (IndexedDB fallback via idb)",
  "voice": "Web Speech API (SpeechRecognition)",
  "export": "jsPDF + html2canvas + SheetJS (xlsx)",
  "testing": "Vitest + React Testing Library + Playwright"
}
```

---

## 2. Project Structure

```
periodontal-chart/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Route group for protected routes
│   │   │   ├── layout.tsx          # Auth layout with navigation
│   │   │   ├── page.tsx            # Dashboard / Patient list
│   │   │   ├── patients/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx    # Patient detail / Chart list
│   │   │   │   │   └── charts/
│   │   │   │   │       └── [chartId]/
│   │   │   │   │           └── page.tsx  # Main chart workspace
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── api/                    # API routes (future backend)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                # Landing / Login
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── tooltip.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── NavigationSidebar.tsx
│   │   │   ├── NavigationRenderer.tsx
│   │   │   ├── MicWidget.tsx
│   │   │   └── TabBar.tsx
│   │   ├── chart/
│   │   │   ├── ChartWorkspace.tsx
│   │   │   ├── JawChart.tsx
│   │   │   ├── SvgPlaceholder.tsx
│   │   │   ├── ToothTable.tsx
│   │   │   ├── ToothSurfaceSvg.tsx
│   │   │   ├── PerioPolygon.tsx
│   │   │   ├── FurcationMarker.tsx
│   │   │   ├── ImplantOverlay.tsx
│   │   │   ├── MissingToothDiagonal.tsx
│   │   │   ├── InterProximalPolygon.tsx
│   │   │   ├── RemoteControlPanel.tsx
│   │   │   ├── PdHighlighter.tsx
│   │   │   └── SummaryMetrics.tsx
│   │   ├── forms/
│   │   │   ├── PatientForm.tsx
│   │   │   ├── ChartHeaderForm.tsx
│   │   │   ├── GeneralHealthForm.tsx
│   │   │   ├── MicrobiologyForm.tsx
│   │   │   ├── ClassificationModal.tsx
│   │   │   ├── IntervalModal.tsx
│   │   │   ├── CalibrationModal.tsx
│   │   │   ├── ProfileModal.tsx
│   │   │   ├── AiPromptModal.tsx
│   │   │   └── ExportImportModal.tsx
│   │   └── modals/
│   │       ├── ConfirmDialog.tsx
│   │       ├── ChoiceDialog.tsx
│   │       └── StorageFullDialog.tsx
│   ├── lib/
│   │   ├── store/
│   │   │   ├── useChartStore.ts          # Zustand: chart data, UI state
│   │   │   ├── usePatientStore.ts        # Zustand: patients, charts
│   │   │   ├── useSettingsStore.ts       # Zustand: user settings
│   │   │   └── useOverlayStore.ts        # Zustand: comparison overlay
│   │   ├── hooks/
│   │   │   ├── useChartData.ts           # Data collection/transformation
│   │   │   ├── useVoiceInput.ts          # Speech recognition
│   │   │   ├── useLocalStorage.ts        # Persistence
│   │   │   ├── useAutoSave.ts            # Debounced auto-save
│   │   │   └── useKeyboardShortcuts.ts   # Keyboard navigation
│   │   ├── utils/
│   │   │   ├── toothNumbering.ts         # FDI ↔ Universal conversion
│   │   │   ├── dataSorting.ts            # Clinical data sorting
│   │   │   ├── dateUtils.ts              # Date formatting/parsing
│   │   │   ├── coordinateMaps.ts         # SVG coordinate mappings
│   │   │   ├── clinicalCalculations.ts   # AL, CAL, recession calculations
│   │   │   ├── exportImport.ts           # JSON/PDF/Excel export
│   │   │   └── validation.ts             # Zod schemas
│   │   ├── constants/
│   │   │   ├── teeth.ts                  # Tooth arrays, surfaces, quadrants
│   │   │   ├── surfaces.ts               # Surface definitions per jaw
│   │   │   ├── furcation.ts              # Furcation sites per tooth
│   │   │   ├── colors.ts                 # Clinical color coding
│   │   │   └── translations.ts           # i18n keys
│   │   └── types/
│   │       ├── clinical.ts               # Clinical data types
│   │       ├── patient.ts                # Patient/Chart types
│   │       ├── settings.ts               # Settings types
│   │       └── ui.ts                     # UI state types
│   ├── styles/
│   │   └── chart.css                     # Chart-specific styles
│   └── middleware.ts                     # Auth middleware (future)
├── public/
│   ├── img/
│   │   ├── implants/                     # Implant marker images
│   │   ├── flags/                        # Language flags
│   │   └── logo/
│   └── json/
│       └── template.json                 # Default chart template
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Data Model (TypeScript Types)

### 3.1 Clinical Data Types (`src/lib/types/clinical.ts`)

```typescript
// Surface identifiers (9 surfaces per tooth)
export type SurfaceId =
  | 'mb' | 'b' | 'db'      // Buccal: mesiobuccal, buccal, distobuccal
  | 'mp' | 'p' | 'dp'      // Palatinal (upper): mesioppalatal, palatal, distopalatal
  | 'ml' | 'l' | 'dl';     // Lingual (lower): mesiolingual, lingual, distolingual

// Furcation sites
export type FurcationSite = 'b' | 'dp' | 'mp' | 'l' | 'p';

// Tooth numbering systems
export type ToothNumberingSystem = 'FDI' | 'Universal';

// FDI tooth numbers (11-48, excluding 0, 9)
export type FDIToothNumber = 
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28
  | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38
  | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48;

// Universal tooth numbers (1-32)
export type UniversalToothNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32;

// Implant status
export type ImplantStatus = 0 | 1 | 2 | 3; // 0=none, 1=gray, 2=red, 3=green

// Mobility grades
export type MobilityGrade = 0 | 1 | 2 | 3;

// Furcation grades
export type FurcationGrade = 0 | 1 | 2 | 3;

// BOP / PI values
export type BinaryIndex = 0 | 1;

// View status
export type ViewStatus = 0 | 1 | 2; // 0=PD, 1=GM, 2=AL

// Active indices configuration
export interface ActiveIndices {
  pockets: boolean;
  bone: boolean;
  furcation: boolean;
  plaque: boolean;
  bop: boolean;
  mobility: boolean;
  recession: boolean;
  muc: boolean;
  pt: boolean;
  cej: boolean;
  wsd: boolean;
  gi_sci: boolean;
  mgi_sci: boolean;
  pi_sci: boolean;
  mpi_sci: boolean;
}

// Clinical data for a single tooth
export interface ToothClinicalData {
  // Tooth presence
  tooth: BinaryIndex;
  
  // Mobility
  mobility: MobilityGrade;
  
  // Furcation (varies by tooth type)
  furcation_b?: FurcationGrade;
  furcation_dp?: FurcationGrade;
  furcation_mp?: FurcationGrade;
  furcation_l?: FurcationGrade;
  furcation_p?: FurcationGrade;
  
  // Implant
  implant: ImplantStatus;
  
  // BOP (6 sites upper, 6 sites lower)
  bop_mb: BinaryIndex;
  bop_b: BinaryIndex;
  bop_db: BinaryIndex;
  bop_mp: BinaryIndex;
  bop_p: BinaryIndex;
  bop_dp: BinaryIndex;
  bop_ml: BinaryIndex;
  bop_l: BinaryIndex;
  bop_dl: BinaryIndex;
  
  // PI (same sites as BOP)
  pi_mb: BinaryIndex;
  pi_b: BinaryIndex;
  pi_db: BinaryIndex;
  pi_mp: BinaryIndex;
  pi_p: BinaryIndex;
  pi_dp: BinaryIndex;
  pi_ml: BinaryIndex;
  pi_l: BinaryIndex;
  pi_dl: BinaryIndex;
  
  // GM (Gingival Margin)
  gm_mb: number;
  gm_b: number;
  gm_db: number;
  gm_mp: number;
  gm_p: number;
  gm_dp: number;
  gm_ml: number;
  gm_l: number;
  gm_dl: number;
  
  // PD (Probing Depth)
  pd_mb: number;
  pd_b: number;
  pd_db: number;
  pd_mp: number;
  pd_p: number;
  pd_dp: number;
  pd_ml: number;
  pd_l: number;
  pd_dl: number;
  
  // AL (Clinical Attachment Level) - calculated
  al_mb: number;
  al_b: number;
  al_db: number;
  al_mp: number;
  al_p: number;
  al_dp: number;
  al_ml: number;
  al_l: number;
  al_dl: number;
  
  // Mucogingival
  muc_mb?: number;
  muc_b?: number;
  muc_db?: number;
  muc_mp?: number;
  muc_p?: number;
  muc_dp?: number;
  muc_ml?: number;
  muc_l?: number;
  muc_dl?: number;
  
  // Recession
  rec_y?: number;
  rec_x?: number;
  recMiller?: string;
  recCairo?: string;
  
  // Pocket measurements
  pt?: number;
  width?: number;
  cej?: number;
  wsd?: number;
  
  // Indices
  gi_sci?: number;
  mgi_sci?: number;
  pi_sci?: number;
  mpi_sci?: number;
  
  // Notes
  note: string;
}

// Complete chart data
export interface ChartData {
  // Metadata
  date_saved: string;           // ISO timestamp
  url: string;
  copyright: string;
  date: string;                 // YYYY-MM-DD
  patient_number: string;
  patient_last_name: string;
  patient_first_name: string;
  patient_dob: string;          // YYYY-MM-DD
  initial_exam: BinaryIndex;
  reevaluation: BinaryIndex;
  reevaluation_note: string;
  clinician: string;
  
  // UI State
  viewStatus: ViewStatus;
  isGmInverted: boolean;
  isMirrored: boolean;
  active_indices: ActiveIndices;
  
  // Chart ID (for internal tracking)
  chart_id?: string;
  patient_id?: string;
  created_at?: string;
  
  // Clinical data (dynamic keys: {prefix}_{tooth}_{surface})
  [key: string]: any;
}

// Template for new charts
export const CHART_TEMPLATE: ChartData = {
  date_saved: '',
  url: 'periodontalchart-online.ch',
  copyright: 'www.perio-tools.com (2025)',
  date: '',
  patient_number: '',
  patient_last_name: '',
  patient_first_name: '',
  patient_dob: '',
  initial_exam: 0,
  reevaluation: 0,
  reevaluation_note: '',
  clinician: '',
  viewStatus: 2,
  isGmInverted: true,
  isMirrored: false,
  active_indices: {
    pockets: true,
    bone: true,
    furcation: true,
    plaque: true,
    bop: true,
    mobility: true,
    recession: false,
    muc: false,
    pt: false,
    cej: false,
    wsd: false,
    gi_sci: false,
    mgi_sci: false,
    pi_sci: false,
    mpi_sci: false,
  },
};
```

### 3.2 Patient/Chart Types (`src/lib/types/patient.ts`)

```typescript
export interface Patient {
  id: string;
  last_name: string;
  first_name: string;
  patient_dob: string;
  pnummer: string;
  charts: Chart[];
  is_favourite: boolean;
  toggle_state: 1 | 0;
}

export interface Chart {
  id: string;
  date: string;                 // YYYY-MM-DD
  patient_first_name: string;
  patient_last_name: string;
  patient_dob: string;
  clinician: string;
  initial_exam: boolean;
  reevaluation: boolean;
  reevaluation_note: string;
  json_data: string;            // JSON.stringify(ChartData)
  created_at: string;           // ISO timestamp
}

export interface AppData {
  patients: Patient[];
  settings: UserSettings;
}

export interface UserSettings {
  isGmInverted: boolean;
  dateFormat: 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  language: LanguageCode;
  autoSaveInterval: number;     // milliseconds
  showTooltips: boolean;
  compactMode: boolean;
}

export type LanguageCode = 
  | 'en-gb' | 'en-us' | 'de' | 'fr' | 'it' | 'es' 
  | 'eu' | 'pt-br' | 'pt-pt' | 'pl' | 'dk' | 'ro' | 'bg';
```

### 3.3 UI State Types (`src/lib/types/ui.ts`)

```typescript
export type RemoteControlMode = 
  | 'bop' | 'plaque' | '5mm' | '6mmplus'
  | 'classification' | 'interval' | 'overview' | 'pockets'
  | 'bone' | 'furcation' | 'report' | 'analysis'
  | 'three' | 'calibration' | 'pdf-import' | 'profile' | 'aiprompt';

export type ContainerView = 
  | 'main-chart-container'
  | 'main-overlay-container'
  | 'main-history-container'
  | 'main-general-health-container'
  | 'main-microbiology-container'
  | 'main-profile-container'
  | 'main-aiprompt-container';

export interface UIState {
  // Active modes
  activeRemoteControl: RemoteControlMode;
  activeContainer: ContainerView;
  
  // Navigation
  navigationHidden: boolean;
  sortDirection: 'fav_asc' | 'fav_desc' | 'date_asc' | 'date_desc' | 'none';
  
  // Current selection
  activePatientId: string | null;
  activeChartId: string | null;
  latestChartId: string | null;
  
  // Overlay/Comparison
  overlayData: ChartData | null;
  mainData: ChartData | null;
  mainMicroData: any | null;
  overlayMicroData: any | null;
  selectedChartIdsForOverlay: string[];
  
  // Form state
  currentLoadedData: ChartData | null;
  lastSavedPerioData: string | null;
  
  // Voice input
  micMode: 'live' | 'batch';
  micTranscript: string;
  micTraining: Record<string, string>;
  
  // Modals
  openModals: string[];
  
  // Toasts
  toasts: Toast[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
```

---

## 4. State Architecture (Zustand Stores)

### 4.1 Chart Store (`src/lib/store/useChartStore.ts`)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ChartData, ToothClinicalData, ActiveIndices, ViewStatus } from '@/lib/types/clinical';

interface ChartState {
  // Current chart data
  data: ChartData;
  
  // UI state
  viewStatus: ViewStatus;
  isGmInverted: boolean;
  isMirrored: boolean;
  activeIndices: ActiveIndices;
  
  // Computed
  hasClinicalData: boolean;
  isDirty: boolean;
  
  // Actions
  setData: (data: Partial<ChartData>) => void;
  updateField: (key: string, value: any) => void;
  updateTooth: (tooth: number, data: Partial<ToothClinicalData>) => void;
  setViewStatus: (status: ViewStatus) => void;
  toggleGmInverted: () => void;
  toggleMirrored: () => void;
  setActiveIndices: (indices: Partial<ActiveIndices>) => void;
  calculateAL: () => void;
  collectDataAsJson: () => ChartData;
  reset: () => void;
  markDirty: (dirty: boolean) => void;
}

const initialState: ChartState = {
  data: CHART_TEMPLATE,
  viewStatus: 2,
  // Site default for lang=es (js/script.js: isGmInverted = isUSA -> false):
  // positive GM = recession, AL = PD - GM.
  isGmInverted: false,
  isMirrored: false,
  active_indices: CHART_TEMPLATE.active_indices,
  hasClinicalData: false,
  isDirty: false,
};

export const useChartStore = create<ChartState>()(
  immer((set, get) => ({
    ...initialState,
    
    setData: (newData) => set((state) => {
      Object.assign(state.data, newData);
      state.isDirty = true;
    }),
    
    updateField: (key, value) => set((state) => {
      state.data[key] = value;
      state.isDirty = true;
      
      // Recalculate AL if PD or GM changed
      if (key.startsWith('pd_') || key.startsWith('gm_')) {
        get().calculateAL();
      }
    }),
    
    updateTooth: (tooth, toothData) => set((state) => {
      Object.entries(toothData).forEach(([key, value]) => {
        state.data[`${key}_${tooth}`] = value;
      });
      state.isDirty = true;
      get().calculateAL();
    }),
    
    setViewStatus: (status) => set((state) => {
      state.viewStatus = status;
      state.data.viewStatus = status;
    }),
    
    toggleGmInverted: () => set((state) => {
      state.isGmInverted = !state.isGmInverted;
      state.data.isGmInverted = state.isGmInverted;
      get().calculateAL();
    }),
    
    toggleMirrored: () => set((state) => {
      state.isMirrored = !state.isMirrored;
      state.data.isMirrored = state.isMirrored;
    }),
    
    setActiveIndices: (indices) => set((state) => {
      state.activeIndices = { ...state.activeIndices, ...indices };
      state.data.active_indices = state.activeIndices;
    }),
    
    calculateAL: () => set((state) => {
      const isInverted = state.isGmInverted;
      const surfaces: SurfaceId[] = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];
      const teeth = [...UPPER_TEETH, ...LOWER_TEETH];
      
      teeth.forEach(tooth => {
        surfaces.forEach(surface => {
          const pdKey = `pd_${tooth}_${surface}`;
          const gmKey = `gm_${tooth}_${surface}`;
          const alKey = `al_${tooth}_${surface}`;
          
          const pd = parseFloat(state.data[pdKey]) || 0;
          const gm = parseFloat(state.data[gmKey]) || 0;
          
          state.data[alKey] = isInverted ? pd + gm : pd - gm;
        });
      });
    }),
    
    collectDataAsJson: () => {
      const state = get();
      return { ...state.data, viewStatus: state.viewStatus, isGmInverted: state.isGmInverted, isMirrored: state.isMirrored, active_indices: state.activeIndices };
    },
    
    reset: () => set(initialState),
    
    markDirty: (dirty) => set((state) => { state.isDirty = dirty; }),
    
    // Computed
    get hasClinicalData() {
      const data = get().data;
      const clinicalKeys = Object.keys(data).filter(k => 
        k.startsWith('pd_') || k.startsWith('gm_') || 
        k.startsWith('bop_') || k.startsWith('pi_') ||
        k.startsWith('furcation_') || k.startsWith('mobility_')
      );
      return clinicalKeys.some(k => {
        const v = data[k];
        return v !== '0' && v !== 0 && v !== '' && v !== undefined && v !== null;
      });
    },
  }))
);
```

### 4.2 Patient Store (`src/lib/store/usePatientStore.ts`)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Patient, Chart, AppData } from '@/lib/types/patient';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'parodontalstatus_data';

interface PatientState {
  patients: Patient[];
  activePatientId: string | null;
  activeChartId: string | null;
  latestChartId: string | null;
  
  // Actions
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
    generateUUID: () => uuidv4(),
  }))
);
```

### 4.3 Settings Store (`src/lib/store/useSettingsStore.ts`)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { UserSettings, LanguageCode } from '@/lib/types/patient';

const DEFAULT_SETTINGS: UserSettings = {
  isGmInverted: true,
  dateFormat: 'DD.MM.YYYY',
  language: 'es',
  autoSaveInterval: 30000,
  showTooltips: true,
  compactMode: false,
};

interface SettingsState {
  settings: UserSettings;
  setSettings: (settings: Partial<UserSettings>) => void;
  setLanguage: (lang: LanguageCode) => void;
  toggleGmInverted: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    settings: DEFAULT_SETTINGS,
    
    setSettings: (newSettings) => set((state) => {
      Object.assign(state.settings, newSettings);
    }),
    
    setLanguage: (lang) => set((state) => {
      state.settings.language = lang;
    }),
    
    toggleGmInverted: () => set((state) => {
      state.settings.isGmInverted = !state.settings.isGmInverted;
    }),
  }))
);
```

### 4.4 Overlay Store (`src/lib/store/useOverlayStore.ts`)

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { ChartData } from '@/lib/types/clinical';

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
```

---

## 5. UI Layout Hierarchy

### 5.1 Root Layout (`src/app/(auth)/layout.tsx`)

```
<AuthLayout>
  <Header />
  <div className="flex h-screen overflow-hidden">
    <NavigationSidebar />
    <main className="flex-1 overflow-auto">
      <TabBar />
      <ContainerView />
    </main>
  </div>
  <MicWidget />
  <Toasts />
  <Modals />
</AuthLayout>
```

### 5.2 Header Component (`src/components/layout/Header.tsx`)

```tsx
interface HeaderProps {
  patientName?: string;
  chartDate?: string;
}

export function Header({ patientName, chartDate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <img src="/img/logo/logo_periodontalchart-online_1218x120.jpg" 
               height={60} alt="Periodontal Chart" />
        </div>
        
        {/* Center: Mic Widget */}
        <MicWidget />
        
        {/* Right: Menu */}
        <nav className="flex items-center gap-4">
          <Link href="https://www.perio-tools.com" target="_blank" className="text-sm text-gray-600 hover:text-blue-600">
            www.perio-tools.com
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
```

### 5.3 Navigation Sidebar (`src/components/layout/NavigationSidebar.tsx`)

```tsx
interface NavigationSidebarProps {
  isHidden: boolean;
  onToggle: () => void;
  patients: Patient[];
  activePatientId: string | null;
  activeChartId: string | null;
  onSelectPatient: (patientId: string) => void;
  onSelectChart: (chartId: string, patientId: string) => void;
  onNewPatient: () => void;
  onNewChart: (patientId: string) => void;
  onDeleteChart: (chartId: string, patientId: string) => void;
  onOverlaySelect: (chartId: string, patientId: string) => void;
}

export function NavigationSidebar(props: NavigationSidebarProps) {
  // Renders collapsible sidebar with:
  // - Patient list (favourites first)
  // - Chart list per patient (with date, type indicators)
  // - Drag-to-reorder (SortableJS)
  // - Context menus for actions
  // - Overlay selection mode (Shift+Click)
}
```

### 5.4 Tab Bar (`src/components/layout/TabBar.tsx`)

```tsx
const TABS = [
  { id: 'main-chart-container', label: 'Parodontalstatus', icon: ToothIcon },
  { id: 'main-overlay-container', label: 'Vergleich', icon: LayersIcon },
  { id: 'main-history-container', label: 'Verlauf', icon: HistoryIcon },
  { id: 'main-general-health-container', label: 'Allgemeiner Status', icon: HeartIcon },
  { id: 'main-microbiology-container', label: 'Mikrobiologie', icon: BacteriaIcon },
] as const;

export function TabBar() {
  const { activeContainer, setActiveContainer } = useUIStore();
  const { activeRemoteControl } = useChartStore();
  
  return (
    <div className="sticky top-16 z-30 bg-white border-b border-gray-200">
      <div className="flex overflow-x-auto px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeContainer === tab.id 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveContainer(tab.id as ContainerView)}
            disabled={/* overlay mode restrictions */}
          >
            <tab.icon className="w-4 h-4" />
            <span>{t(tab.label)}</span>
          </button>
        ))}
        
        {/* Remote Control Buttons */}
        <div className="flex items-center gap-1 ml-auto border-l border-gray-200 pl-4">
          {REMOTE_CONTROLS.map(ctrl => (
            <button
              key={ctrl.action}
              className={`p-2 rounded transition-colors ${
                activeRemoteControl === ctrl.action 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveRemoteControl(ctrl.action)}
              title={t(ctrl.label)}
            >
              <ctrl.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5.5 Chart Workspace (`src/components/chart/ChartWorkspace.tsx`)

```
<ChartWorkspace>
  <div className="grid grid-cols-[1fr_1fr] gap-4 p-4">
    {/* Upper Jaw */}
    <JawChart jaw="upper" teeth={UPPER_TEETH} />
    
    {/* Lower Jaw */}
    <JawChart jaw="lower" teeth={LOWER_TEETH} />
  </div>
  
  {/* Tooth Tables - rendered below charts or in modal */}
  <div className="grid grid-cols-4 gap-2 p-4 max-h-96 overflow-y-auto">
    {ALL_TEETH.map(tooth => <ToothTable key={tooth} tooth={tooth} />)}
  </div>
</ChartWorkspace>
```

### 5.6 Jaw Chart (`src/components/chart/JawChart.tsx`)

```tsx
interface JawChartProps {
  jaw: 'upper' | 'lower';
  teeth: FDIToothNumber[];
}

export function JawChart({ jaw, teeth }: JawChartProps) {
  const { activeRemoteControl, viewStatus, isGmInverted } = useChartStore();
  const data = useChartData();
  
  // 4 SVG placeholders per jaw:
  // Upper: buccal (01), palatinal (02)
  // Lower: buccal (02), lingual (01)
  const placeholders = jaw === 'upper' 
    ? ['upper-svg-placeholder-01', 'upper-svg-placeholder-02']
    : ['lower-svg-placeholder-01', 'lower-svg-placeholder-02'];
  
  return (
    <div className="space-y-4">
      {placeholders.map((id, index) => (
        <SvgPlaceholder 
          key={id} 
          id={id} 
          jaw={jaw}
          view={index === 0 ? 'buccal' : 'oral'}
          teeth={teeth}
        />
      ))}
    </div>
  );
}
```

### 5.7 SVG Placeholder (`src/components/chart/SvgPlaceholder.tsx`)

```tsx
interface SvgPlaceholderProps {
  id: string;
  jaw: 'upper' | 'lower';
  view: 'buccal' | 'oral';
  teeth: FDIToothNumber[];
}

export function SvgPlaceholder({ id, jaw, view, teeth }: SvgPlaceholderProps) {
  const { activeRemoteControl, viewStatus, isGmInverted } = useChartStore();
  const data = useChartData();
  
  // Render layers in order:
  // 1. Background grid
  // 2. Inter-proximal polygons (between teeth)
  // 3. Perio polygons (per tooth)
  // 4. PD/GM/AL lines
  // 5. Mucogingival lines
  // 6. Furcation markers
  // 7. Implant markers
  // 8. Missing tooth diagonals
  // 9. Tooth surface SVGs (for BOP/PI coloring)
  
  return (
    <div id={id} className="relative">
      <svg viewBox="0 0 1200 400" className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          {/* Gradients, patterns */}
        </defs>
        
        {/* Zero reference lines */}
        {ZERO_LINES[id].map(line => (
          <line key={line.y} {...line} stroke="#ccc" strokeWidth="0.5" />
        ))}
        
        {/* Inter-proximal polygons */}
        {teeth.slice(1).map((tooth, i) => (
          <InterProximalPolygon key={tooth} tooth={tooth} prevTooth={teeth[i]} svgId={id} data={data} />
        ))}
        
        {/* Per-tooth polygons */}
        {teeth.map(tooth => (
          <PerioPolygon key={tooth} tooth={tooth} svgId={id} data={data} viewStatus={viewStatus} isGmInverted={isGmInverted} />
        ))}
        
        {/* Furcation markers */}
        {teeth.map(tooth => (
          <FurcationMarker key={tooth} tooth={tooth} svgId={id} data={data} />
        ))}
        
        {/* Implants render in the absolute ImplantOverlay layer outside this SVG */}
        
        {/* Missing tooth diagonals */}
        {teeth.map(tooth => (
          <MissingToothDiagonal key={tooth} tooth={tooth} svgId={id} data={data} />
        ))}
      </svg>
      
      {/* Tooth Surface SVGs (overlay for BOP/PI) */}
      <div className="absolute inset-0 pointer-events-none">
        {teeth.map(tooth => (
          <ToothSurfaceSvg key={tooth} tooth={tooth} view={view} />
        ))}
      </div>
    </div>
  );
}
```

### 5.8 Tooth Table (`src/components/chart/ToothTable.tsx`)

```tsx
interface ToothTableProps {
  tooth: FDIToothNumber;
}

export function ToothTable({ tooth }: ToothTableProps) {
  const { activeRemoteControl, data } = useChartStore();
  const isPresent = data[`tooth_${tooth}`] === '1';
  const isImplant = (data[`implant_${tooth}`] as ImplantStatus) > 0;
  
  // Surfaces for this tooth (varies by position)
  const surfaces = getSurfacesForTooth(tooth);
  const furcationSites = getFurcationSitesForTooth(tooth);
  
  return (
    <div 
      id={`toothTable_${tooth}`}
      className={`tooth-column ${!isPresent ? 'tooth-missing' : ''} ${isImplant ? 'implant-active' : ''}`}
      data-is-present={isPresent}
      data-tooth={tooth}
    >
      {/* Tooth number header */}
      <div className="tooth-header">
        <button 
          className={`tooth-number ${!isPresent ? 'tooth-missing' : ''}`}
          data-tooth={`tooth_${tooth}`}
          onClick={() => toggleToothPresence(tooth)}
        >
          {tooth}
        </button>
        
        {/* Implant indicator */}
        <button 
          className="implant-button"
          data-implant={`implant_${tooth}`}
          onClick={() => cycleImplantStatus(tooth)}
        >
          {isImplant && <ImplantIcon />}
        </button>
      </div>
      
      {/* Mobility */}
      <MobilitySelector tooth={tooth} />
      
      {/* Furcation buttons */}
      <FurcationButtons tooth={tooth} sites={furcationSites} />
      
      {/* Clinical data rows (dynamic based on active indices) */}
      {activeIndices.pockets && <ProbingDepthRow tooth={tooth} surfaces={surfaces} />}
      {activeIndices.bone && <ClinicalAttachmentRow tooth={tooth} surfaces={surfaces} />}
      {activeIndices.bop && <BopRow tooth={tooth} surfaces={surfaces} />}
      {activeIndices.plaque && <PlaqueRow tooth={tooth} surfaces={surfaces} />}
      {activeIndices.recession && <RecessionRow tooth={tooth} surfaces={surfaces} />}
      {activeIndices.muc && <MucogingivalRow tooth={tooth} surfaces={surfaces} />}
      
      {/* Notes */}
      <NoteInput tooth={tooth} />
    </div>
  );
}
```

---

## 6. Rendering Architecture

### 6.1 Coordinate Maps (`src/lib/utils/coordinateMaps.ts`)

```typescript
// SVG coordinate mappings for each tooth and surface
// Extracted from the original application's coordinate files

export const X_COORDINATES: Record<FDIToothNumber, Record<SurfaceId, number>> = {
  // Upper right (18-11)
  18: { mb: 45, b: 65, db: 85, mp: 45, p: 65, dp: 85, ml: 0, l: 0, dl: 0 },
  17: { mb: 155, b: 175, db: 195, mp: 155, p: 175, dp: 195, ml: 0, l: 0, dl: 0 },
  // ... all 32 teeth
};

export const POLYGON_ZERO_LINES: Record<string, number> = {
  'upper-svg-placeholder-01': 180,  // Upper buccal
  'upper-svg-placeholder-02': 220,  // Upper palatinal
  'lower-svg-placeholder-01': 180,  // Lower lingual
  'lower-svg-placeholder-02': 220,  // Lower buccal
};

export const IMPLANT_COORDINATES: Record<string, { x: number; y: number }> = {
  'implant_18_b': { x: 26, y: 57 },
  'implant_18_p': { x: 26, y: 105 },
  // ... all 64 implant positions (y constant per view: 57 upper-buccal,
  // 105-106 upper-palatal, 54 lower-lingual, 112 lower-buccal)
};

export const FURCATION_COORDINATES: Record<string, { x: number; y: number }> = {
  'furcation_18_b': { x: 65, y: 100 },
  'furcation_18_dp': { x: 85, y: 150 },
  'furcation_18_mp': { x: 45, y: 150 },
  // ... all furcation positions
};

export const FURCATION_CHART_COORDINATES: Record<string, Record<string, { x: number; y: number }>> = {
  'upper-svg-placeholder-01': {
    'furcation_18_b': { x: 120, y: 80 },
    // ...
  },
  'upper-svg-placeholder-02': {
    'furcation_18_dp': { x: 200, y: 120 },
    'furcation_18_mp': { x: 80, y: 120 },
    // ...
  },
  // ... for all 4 placeholders
};

export const MISSING_TOOTH_X_POSITIONS: Record<FDIToothNumber, { buccal: number; palatinal: number; lingual: number }> = {
  18: { buccal: 65, palatinal: 65, lingual: 65 },
  17: { buccal: 175, palatinal: 175, lingual: 175 },
  // ...
};

export const DIAGONAL_WIDTH = 40;
export const DIAGONAL_HEIGHT = 400;
export const POLYGON_SCALE = 6.45;
```

### 6.2 Perio Polygon Component (`src/components/chart/PerioPolygon.tsx`)

```tsx
interface PerioPolygonProps {
  tooth: FDIToothNumber;
  svgId: string;
  data: ChartData;
  viewStatus: ViewStatus;
  isGmInverted: boolean;
}

export function PerioPolygon({ tooth, svgId, data, viewStatus, isGmInverted }: PerioPolygonProps) {
  const isLowerJaw = tooth >= 31;
  const isCorrectJaw = (isLowerJaw && svgId.includes('lower')) || (!isLowerJaw && svgId.includes('upper'));
  if (!isCorrectJaw) return null;
  
  // Check tooth presence
  const isToothPresent = data[`tooth_${tooth}`] === '1';
  const isImplantActive = (data[`implant_${tooth}`] as ImplantStatus) > 0;
  if (!isToothPresent || isImplantActive) return null;
  
  const toothXCoords = X_COORDINATES[tooth];
  const zeroLineY = POLYGON_ZERO_LINES[svgId] || 0;
  const scale = POLYGON_SCALE;
  
  // Determine surface order based on tooth position
  const isUpperRight = tooth >= 11 && tooth <= 18;
  const isUpperLeft = tooth >= 21 && tooth <= 28;
  const isLowerRight = tooth >= 41 && tooth <= 48;
  const isLowerLeft = tooth >= 31 && tooth <= 38;
  
  let buccalPositions: SurfaceId[] = [];
  let oralPositions: SurfaceId[] = [];
  
  if (isUpperRight || isLowerRight) {
    buccalPositions = ['db', 'b', 'mb'];
    oralPositions = isLowerJaw ? ['dl', 'l', 'ml'] : ['mp', 'p', 'dp'];
  } else if (isUpperLeft || isLowerLeft) {
    buccalPositions = ['mb', 'b', 'db'];
    oralPositions = isLowerJaw ? ['ml', 'l', 'dl'] : ['dp', 'p', 'mp'];
  } else return null;
  
  const isBuccalView = svgId === 'upper-svg-placeholder-01' || svgId === 'lower-svg-placeholder-02';
  const positions = isBuccalView ? buccalPositions : oralPositions;
  
  const getPoint = (pos: SurfaceId) => {
    const gm = parseFloat(data[`gm_${tooth}_${pos}`]) || 0;
    const pd = parseFloat(data[`pd_${tooth}_${pos}`]) || 0;
    const muc = parseFloat(data[`muc_${tooth}_${pos}`]) || 0;
    
    const adjustedGm = isGmInverted ? -gm : gm;
    
    let gmY, pdY, mucY;
    
    if (!isLowerJaw) { // Upper jaw
      if (svgId === 'upper-svg-placeholder-01') { // Buccal
        gmY = zeroLineY + adjustedGm * scale;
        pdY = gmY - pd * scale;
        mucY = gmY - muc * scale;
      } else { // Palatinal
        gmY = zeroLineY - adjustedGm * scale;
        pdY = gmY + pd * scale;
        mucY = gmY + muc * scale;
      }
    } else { // Lower jaw
      if (svgId === 'lower-svg-placeholder-01') { // Lingual
        gmY = zeroLineY + adjustedGm * scale;
        pdY = gmY - pd * scale;
        mucY = gmY - muc * scale;
      } else { // Buccal
        gmY = zeroLineY - adjustedGm * scale;
        pdY = gmY + pd * scale;
        mucY = gmY + muc * scale;
      }
    }
    
    const getXCoord = (p: SurfaceId) => {
      if (p === 'b') return (toothXCoords['db'] + toothXCoords['mb']) / 2;
      if (p === 'p') return (toothXCoords['dp'] + toothXCoords['mp']) / 2;
      if (p === 'l') return (toothXCoords['dl'] + toothXCoords['ml']) / 2;
      return toothXCoords[p];
    };
    
    const x = getXCoord(pos);
    return { gm: { x, y: gmY ?? 0 }, pd: { x, y: pdY ?? 0 }, muc: { x, y: mucY ?? 0 } };
  };
  
  const values = positions.map(getPoint);
  const gmPoints = values.map(v => v.gm);
  const pdPoints = values.map(v => v.pd);
  const polygonPoints = [...gmPoints, ...pdPoints.slice().reverse()];
  const mucPoints = values.map(v => v.muc);
  
  const formatPoints = (points: { x: number; y: number }[]) => 
    points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  
  // Colors based on viewStatus
  const colors = {
    polygonFill: '#000080',
    polygonOpacity: 0.5,
    pdStroke: '#3b82f6',    // blue
    gmStroke: '#ef4444',    // red
    mucStroke: '#d011a6',   // magenta
  };
  
  const activeIndices = data.active_indices as ActiveIndices;
  
  return (
    <g>
      {/* Periodontal polygon (attachment level) */}
      <polygon
        className="perio-poly"
        data-tooth={tooth}
        points={formatPoints(polygonPoints)}
        fill={colors.polygonFill}
        fillOpacity={colors.polygonOpacity}
        stroke="none"
      />
      
      {/* PD line */}
      <polyline
        className="perio-pd"
        data-tooth={tooth}
        points={formatPoints(pdPoints)}
        fill="none"
        stroke={colors.pdStroke}
        strokeWidth="3"
      />
      
      {/* GM line (when viewStatus shows GM) */}
      {viewStatus === 1 && (
        <polyline
          className="perio-gm"
          data-tooth={tooth}
          points={formatPoints(gmPoints)}
          fill="none"
          stroke={colors.gmStroke}
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      )}
      
      {/* Mucogingival line */}
      {activeIndices.muc && (
        <polyline
          className="perio-muc"
          data-tooth={tooth}
          points={formatPoints(mucPoints)}
          fill="none"
          stroke={colors.mucStroke}
          strokeWidth="2"
        />
      )}
    </g>
  );
}
```

### 6.3 Tooth Surface SVG (`src/components/chart/ToothSurfaceSvg.tsx`)

```tsx
interface ToothSurfaceSvgProps {
  tooth: FDIToothNumber;
  view: 'buccal' | 'oral';
}

export function ToothSurfaceSvg({ tooth, view }: ToothSurfaceSvgProps) {
  const { activeRemoteControl } = useChartStore();
  const data = useChartData();
  const isPresent = data[`tooth_${tooth}`] === '1';
  
  if (!isPresent) return null;
  
  // Surface IDs for this tooth
  const surfaces = getSurfaceElementsForTooth(tooth, view);
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {surfaces.map(surface => (
        <svg
          key={surface.id}
          id={`surface-${tooth}${surface.id}`}
          className="absolute"
          style={{ left: surface.x, top: surface.y, width: surface.w, height: surface.h }}
          viewBox="0 0 100 100"
        >
          <path
            d={surface.path}
            fill={getSurfaceColor(surface.id, activeRemoteControl, data)}
            stroke="#ccc"
            strokeWidth="0.5"
          />
        </svg>
      ))}
    </div>
  );
}

function getSurfaceColor(surfaceId: string, mode: RemoteControlMode, data: ChartData): string {
  if (mode !== 'bop' && mode !== 'plaque') return '#F2F2F2';
  
  const prefix = mode === 'bop' ? 'bop' : 'pi';
  const key = `${prefix}_${tooth}_${surfaceId}`;
  const isActive = data[key] === '1' || data[key] === 1;
  
  return isActive ? (mode === 'bop' ? '#ef4444' : '#3b82f6') : '#F2F2F2';
}
```

---

## 7. Clinical Workflow Implementation

### 7.1 Data Collection Hook (`src/lib/hooks/useChartData.ts`)

```typescript
import { useChartStore } from '@/lib/store/useChartStore';
import { ChartData, ToothClinicalData, FDIToothNumber, SurfaceId } from '@/lib/types/clinical';

export function useChartData() {
  const { data, collectDataAsJson, updateField, updateTooth, calculateAL } = useChartStore();
  
  // Get all clinical data for a tooth
  const getToothData = (tooth: FDIToothNumber): ToothClinicalData => {
    const surfaces: SurfaceId[] = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];
    const toothData: Partial<ToothClinicalData> = {};
    
    surfaces.forEach(surface => {
      toothData[`bop_${surface}`] = data[`bop_${tooth}_${surface}`];
      toothData[`pi_${surface}`] = data[`pi_${tooth}_${surface}`];
      toothData[`gm_${surface}`] = data[`gm_${tooth}_${surface}`];
      toothData[`pd_${surface}`] = data[`pd_${tooth}_${surface}`];
      toothData[`al_${surface}`] = data[`al_${tooth}_${surface}`];
      toothData[`muc_${surface}`] = data[`muc_${tooth}_${surface}`];
    });
    
    toothData.tooth = data[`tooth_${tooth}`];
    toothData.mobility = data[`mobility_${tooth}`];
    toothData.furcation_b = data[`furcation_${tooth}_b`];
    toothData.furcation_dp = data[`furcation_${tooth}_dp`];
    toothData.furcation_mp = data[`furcation_${tooth}_mp`];
    toothData.furcation_l = data[`furcation_${tooth}_l`];
    toothData.furcation_p = data[`furcation_${tooth}_p`];
    toothData.implant = data[`implant_${tooth}`];
    toothData.note = data[`note_${tooth}`];
    toothData.rec_y = data[`rec_y_${tooth}`];
    toothData.rec_x = data[`rec_x_${tooth}`];
    toothData.recMiller = data[`recMiller_${tooth}`];
    toothData.recCairo = data[`recCairo_${tooth}`];
    toothData.pt = data[`pt_${tooth}`];
    toothData.width = data[`width_${tooth}`];
    toothData.cej = data[`cej_${tooth}`];
    toothData.wsd = data[`wsd_${tooth}`];
    toothData.gi_sci = data[`gi_sci_${tooth}`];
    toothData.mgi_sci = data[`mgi_sci_${tooth}`];
    toothData.pi_sci = data[`pi_sci_${tooth}`];
    toothData.mpi_sci = data[`mpi_sci_${tooth}`];
    
    return toothData as ToothClinicalData;
  };
  
  // Update a single surface value
  const updateSurface = (tooth: FDIToothNumber, surface: SurfaceId, prefix: string, value: number | string) => {
    updateField(`${prefix}_${tooth}_${surface}`, value);
  };
  
  // Toggle BOP/PI
  const toggleIndex = (tooth: FDIToothNumber, surface: SurfaceId, type: 'bop' | 'pi') => {
    const key = `${type}_${tooth}_${surface}`;
    const current = data[key] === '1' || data[key] === 1;
    updateField(key, current ? '0' : '1');
    
    // Trigger SVG re-render
    window.dispatchEvent(new CustomEvent('svg-render', { detail: { tooth, type } }));
  };
  
  // Toggle tooth presence
  const toggleTooth = (tooth: FDIToothNumber) => {
    const current = data[`tooth_${tooth}`] === '1';
    updateField(`tooth_${tooth}`, current ? '0' : '1');
    
    // If tooth removed, clear all clinical data for this tooth
    if (current) {
      clearToothData(tooth);
    }
  };
  
  // Cycle implant status (0 → 1 → 2 → 3 → 0)
  const cycleImplant = (tooth: FDIToothNumber) => {
    const current = (data[`implant_${tooth}`] as number) || 0;
    const next = (current + 1) % 4;
    updateField(`implant_${tooth}`, next.toString());
  };
  
  // Update furcation
  const updateFurcation = (tooth: FDIToothNumber, site: string, grade: 0 | 1 | 2 | 3) => {
    updateField(`furcation_${tooth}_${site}`, grade.toString());
    window.dispatchEvent(new CustomEvent('svg-render', { detail: { tooth } }));
  };
  
  // Update mobility
  const updateMobility = (tooth: FDIToothNumber, grade: 0 | 1 | 2 | 3) => {
    updateField(`mobility_${tooth}`, grade.toString());
  };
  
  // Update note
  const updateNote = (tooth: FDIToothNumber, note: string) => {
    updateField(`note_${tooth}`, note);
  };
  
  return {
    data,
    collectDataAsJson,
    getToothData,
    updateSurface,
    toggleIndex,
    toggleTooth,
    cycleImplant,
    updateFurcation,
    updateMobility,
    updateNote,
    calculateAL,
  };
}
```

### 7.2 Voice Input Hook (`src/lib/hooks/useVoiceInput.ts`)

```typescript
import { useState, useEffect, useCallback } from 'react';

interface VoiceCommand {
  command: string;
  params: Record<string, string>;
}

const COMMAND_PATTERNS = {
  tooth_status: /(?:diente|tooth|zahn)\s+(\d{1,2})\s+(falta|fehlt|presente|ist da)/i,
  mobility: /(?:movilidad|mobility|lockerung)\s+(\d{1,2})\s+(?:grado|grade|grad)\s+(\d)/i,
  implant: /(?:implante|implant|implantat)\s+(\d{1,2})/i,
  furcation: /(\d{1,2})\s+furcaci[oó]n\s+grado\s+(\d)\s+(bucal|palatino|lingual|b|p|l|dp|mp)/i,
  bop_pi: /(sangrado|bop|placa|pi|m[áa]s|menos|plus|minus)/i,
  start_recording: /start\s+(\d{1,2})\s+(distobucal|mesiolingual|mesiobucal|distolingual|bucal|lingual|palatino|mesial|distal)/i,
  stop: /stop/i,
};

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<'live' | 'batch'>('live');
  const [training, setTraining] = useState<Record<string, string>>({});
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript.trim());
          processCommand(finalTranscript.trim());
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
      };
    }
    
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);
  
  const processCommand = useCallback((text: string) => {
    // Apply training corrections
    let correctedText = text;
    Object.entries(training).forEach(([wrong, correct]) => {
      correctedText = correctedText.replace(new RegExp(wrong, 'gi'), correct);
    });
    
    // Parse commands
    // ... implementation matches original audio_dictionaries.js logic
  }, [training]);
  
  const startListening = useCallback(() => {
    recognitionRef.current?.start();
    setIsListening(true);
  }, []);
  
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);
  
  const toggleMode = useCallback(() => {
    setMode(m => m === 'live' ? 'batch' : 'live');
  }, []);
  
  return {
    isListening,
    transcript,
    mode,
    training,
    startListening,
    stopListening,
    toggleMode,
    addTraining: (wrong: string, correct: string) => setTraining(t => ({ ...t, [wrong]: correct })),
  };
}
```

### 7.3 Auto-Save Hook (`src/lib/hooks/useAutoSave.ts`)

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useChartStore } from '@/lib/store/useChartStore';
import { usePatientStore } from '@/lib/store/usePatientStore';

export function useAutoSave(interval = 30000) {
  const { data, isDirty, collectDataAsJson } = useChartStore();
  const { activePatientId, activeChartId, updateChart, saveToStorage } = usePatientStore();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const flushRef = useRef<() => void>();
  
  const flush = useCallback(async () => {
    if (!isDirty || !activePatientId || !activeChartId) return;
    
    const chartData = collectDataAsJson();
    const success = updateChart(activePatientId, {
      id: activeChartId,
      json_data: JSON.stringify(chartData),
      date: chartData.date,
      patient_first_name: chartData.patient_first_name,
      patient_last_name: chartData.patient_last_name,
      patient_dob: chartData.patient_dob,
      clinician: chartData.clinician,
      initial_exam: chartData.initial_exam === '1',
      reevaluation: chartData.reevaluation === '1',
      reevaluation_note: chartData.reevaluation_note,
      created_at: new Date().toISOString(),
    });
    
    if (success) {
      saveToStorage();
      useChartStore.getState().markDirty(false);
    }
  }, [isDirty, activePatientId, activeChartId, collectDataAsJson, updateChart, saveToStorage]);
  
  flushRef.current = flush;
  
  useEffect(() => {
    if (isDirty) {
      timeoutRef.current = setTimeout(() => {
        flushRef.current?.();
      }, interval);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isDirty, interval]);
  
  return { flush };
}
```

---

## 8. Persistence Layer

### 8.1 LocalStorage Manager (`src/lib/utils/localStorage.ts`)

```typescript
const STORAGE_KEY = 'parodontalstatus_data';
const BACKUP_KEY = 'parodontalstatus_backup';

export interface StorageData {
  patients: Patient[];
  settings: UserSettings;
  version: number;
}

const CURRENT_VERSION = 2;

export function loadFromStorage(): StorageData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return migrateData(data);
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    // Try backup
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) return JSON.parse(backup);
    } catch {}
  }
  return null;
}

export function saveToStorage(data: StorageData): boolean {
  try {
    const json = JSON.stringify({ ...data, version: CURRENT_VERSION });
    localStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(BACKUP_KEY, json); // Keep backup
    return true;
  } catch (e) {
    if (isQuotaExceeded(e)) {
      showStorageFullDialog();
    }
    return false;
  }
}

function isQuotaExceeded(e: unknown): boolean {
  if (e instanceof DOMException) {
    return e.name === 'QuotaExceededError' || e.code === 22;
  }
  return false;
}

function migrateData(data: any): StorageData {
  // Version 1 → 2: input_reevaluation → reevaluation_note
  if (!data.version || data.version < 2) {
    data.patients?.forEach((patient: any) => {
      patient.charts?.forEach((chart: any) => {
        if (chart.input_reevaluation && !chart.reevaluation_note) {
          chart.reevaluation_note = chart.input_reevaluation;
          delete chart.input_reevaluation;
        }
        if (chart.json_data) {
          try {
            const jsonData = JSON.parse(chart.json_data);
            if (jsonData.input_reevaluation && !jsonData.reevaluation_note) {
              jsonData.reevaluation_note = jsonData.input_reevaluation;
              delete jsonData.input_reevaluation;
              chart.json_data = JSON.stringify(jsonData);
            }
          } catch {}
        }
      });
    });
  }
  return { ...data, version: CURRENT_VERSION };
}

function showStorageFullDialog() {
  // Render modal with export button
  // Implementation matches LocalDataManager.zeigeSpeicherVoll()
}
```

### 8.2 Export/Import (`src/lib/utils/exportImport.ts`)

```typescript
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { ChartData, Patient, Chart } from '@/lib/types';

export async function exportChartAsJson(chartData: ChartData): Promise<void> {
  const json = JSON.stringify(chartData, null, 2);
  downloadFile(json, `periodontal_chart_${chartData.date}.json`, 'application/json');
}

export async function exportChartAsPdf(chartData: ChartData, elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
  pdf.save(`periodontal_chart_${chartData.date}.pdf`);
}

export async function exportChartAsExcel(chartData: ChartData): Promise<void> {
  const workbook = XLSX.utils.book_new();
  
  // Metadata sheet
  const metaRows = Object.entries(chartData)
    .filter(([k]) => !k.match(/^(pd|gm|bop|pi|furcation|mobility|implant|al|muc|rec|pt|width|cej|wsd|gi_|mpi_|pi_|mgi_|note)_/))
    .map(([key, value]) => ({ Field: key, Value: value }));
  const metaSheet = XLSX.utils.json_to_sheet(metaRows);
  XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');
  
  // Clinical data sheet
  const clinicalRows = Object.entries(chartData)
    .filter(([k]) => k.match(/^(pd|gm|bop|pi|furcation|mobility|implant|al|muc|rec|pt|width|cej|wsd|gi_|mpi_|pi_|mgi_|note)_/))
    .map(([key, value]) => ({ Key: key, Value: value }));
  const clinicalSheet = XLSX.utils.json_to_sheet(clinicalRows);
  XLSX.utils.book_append_sheet(workbook, clinicalSheet, 'Clinical Data');
  
  XLSX.writeFile(workbook, `periodontal_chart_${chartData.date}.xlsx`);
}

export async function exportAllPatients(patients: Patient[]): Promise<void> {
  const data = { patients, exportDate: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `periodontal_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

export function importFromJson(jsonString: string): { patients: Patient[]; charts: Chart[] } | null {
  try {
    const data = JSON.parse(jsonString);
    // Validate structure
    if (data.patients && Array.isArray(data.patients)) {
      return { patients: data.patients, charts: [] };
    }
    if (data.chart_id && data.patient_id) {
      // Single chart import
      return { patients: [], charts: [data] };
    }
    return null;
  } catch {
    return null;
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

---

## 9. Key Constants

### 9.1 Teeth Constants (`src/lib/constants/teeth.ts`)

```typescript
export const UPPER_TEETH: FDIToothNumber[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH: FDIToothNumber[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ALL_TEETH: FDIToothNumber[] = [...UPPER_TEETH, ...LOWER_TEETH];

export const QUADRANT_TEETH: Record<number, FDIToothNumber[]> = {
  1: [18, 17, 16, 15, 14, 13, 12, 11],
  2: [21, 22, 23, 24, 25, 26, 27, 28],
  3: [38, 37, 36, 35, 34, 33, 32, 31],
  4: [41, 42, 43, 44, 45, 46, 47, 48],
};

export function getQuadrant(tooth: FDIToothNumber): 1 | 2 | 3 | 4 {
  if (tooth >= 11 && tooth <= 18) return 1;
  if (tooth >= 21 && tooth <= 28) return 2;
  if (tooth >= 31 && tooth <= 38) return 3;
  return 4;
}

export function isUpperJaw(tooth: FDIToothNumber): boolean {
  return tooth >= 11 && tooth <= 28;
}

export function isLowerJaw(tooth: FDIToothNumber): boolean {
  return tooth >= 31 && tooth <= 48;
}

export function getOpposingTooth(tooth: FDIToothNumber): FDIToothNumber {
  const opposites: Record<FDIToothNumber, FDIToothNumber> = {
    18: 48, 17: 47, 16: 46, 15: 45, 14: 44, 13: 43, 12: 42, 11: 41,
    21: 31, 22: 32, 23: 33, 24: 34, 25: 35, 26: 36, 27: 37, 28: 38,
    31: 21, 32: 22, 33: 23, 34: 24, 35: 25, 36: 26, 37: 27, 38: 28,
    41: 11, 42: 12, 43: 13, 44: 14, 45: 15, 46: 16, 47: 17, 48: 18,
  };
  return opposites[tooth];
}
```

### 9.2 Surfaces Constants (`src/lib/constants/surfaces.ts`)

```typescript
export const BUCCAL_SURFACES: SurfaceId[] = ['mb', 'b', 'db'];
export const ORAL_SURFACES_UPPER: SurfaceId[] = ['mp', 'p', 'dp'];
export const ORAL_SURFACES_LOWER: SurfaceId[] = ['ml', 'l', 'dl'];

export function getBuccalSurfaces(tooth: FDIToothNumber): SurfaceId[] {
  const isRight = (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);
  return isRight ? ['db', 'b', 'mb'] : ['mb', 'b', 'db'];
}

export function getOralSurfaces(tooth: FDIToothNumber): SurfaceId[] {
  const isUpper = tooth >= 11 && tooth <= 28;
  const isRight = (tooth >= 11 && tooth <= 18) || (tooth >= 41 && tooth <= 48);
  
  if (isUpper) {
    return isRight ? ['mp', 'p', 'dp'] : ['dp', 'p', 'mp'];
  } else {
    return isRight ? ['dl', 'l', 'ml'] : ['ml', 'l', 'dl'];
  }
}

export function getAllSurfacesForTooth(tooth: FDIToothNumber): SurfaceId[] {
  return [...getBuccalSurfaces(tooth), ...getOralSurfaces(tooth)];
}

export const FURCATION_SITES_UPPER: Record<FDIToothNumber, FurcationSite[]> = {
  18: ['b', 'dp', 'mp'], 17: ['b', 'dp', 'mp'], 16: ['b', 'dp', 'mp'],
  15: ['dp', 'mp'], 14: ['dp', 'mp'], 13: [], 12: [], 11: [],
  21: [], 22: [], 23: [], 24: ['dp', 'mp'], 25: ['dp', 'mp'],
  26: ['b', 'dp', 'mp'], 27: ['b', 'dp', 'mp'], 28: ['b', 'dp', 'mp'],
};

export const FURCATION_SITES_LOWER: Record<FDIToothNumber, FurcationSite[]> = {
  38: ['b', 'l'], 37: ['b', 'l'], 36: ['b', 'l'],
  35: [], 34: [], 33: [], 32: [], 31: [],
  41: [], 42: [], 43: [], 44: [], 45: [],
  46: ['b', 'l'], 47: ['b', 'l'], 48: ['b', 'l'],
};

export function getFurcationSitesForTooth(tooth: FDIToothNumber): FurcationSite[] {
  return isUpperJaw(tooth) 
    ? FURCATION_SITES_UPPER[tooth] || []
    : FURCATION_SITES_LOWER[tooth] || [];
}
```

### 9.3 Colors (`src/lib/constants/colors.ts`)

```typescript
export const CLINICAL_COLORS = {
  // BOP (Bleeding on Probing)
  bop: {
    active: '#ef4444',      // red-500
    inactive: '#F2F2F2',    // gray-100
    tooltip: '#fee2e2',     // red-50
  },
  
  // PI (Plaque Index)
  plaque: {
    active: '#3b82f6',      // blue-500
    inactive: '#F2F2F2',
    tooltip: '#dbeafe',     // blue-50
  },
  
  // Periodontal polygon
  perio: {
    polygonFill: '#000080',  // navy
    polygonOpacity: 0.5,
    pdStroke: '#3b82f6',     // blue
    gmStroke: '#ef4444',     // red
    mucStroke: '#d011a6',    // magenta
  },
  
  // Furcation grades
  furcation: {
    1: 'black',     // Grade 1: circle outline
    2: 'black',     // Grade 2: half-filled
    3: 'black',     // Grade 3: filled
  },
  
  // Implant status
  implant: {
    0: 'transparent',
    1: 'gray',      // Gray implant
    2: '#ef4444',   // Red implant (warning)
    3: '#22c55e',   // Green implant (healthy)
  },
  
  // PD Highlights
  pdHighlight: {
    '5mm': '#fbbf24',     // amber-400
    '6mm+': '#ef4444',    // red-500
  },
  
  // Tooth states
  tooth: {
    present: '#F2F2F2',
    missing: '#828282',
    implantActive: '#e0e7ff',  // indigo-50
  },
};
```

---

## 10. Internationalization (i18n)

### 10.1 Translation Structure (`src/lib/constants/translations.ts`)

```typescript
export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  'es': {
    // UI Labels
    'btn_save': 'Guardar',
    'btn_delete': 'Eliminar',
    'btn_cancel': 'Cancelar',
    'btn_confirm': 'Confirmar',
    'btn_export': 'Exportar',
    'btn_import': 'Importar',
    
    // Chart
    'chart_title': 'Estado Parodontal',
    'tooth_present': 'Presente',
    'tooth_missing': 'Ausente',
    'mobility': 'Movilidad',
    'furcation': 'Furcación',
    'implant': 'Implante',
    'probing_depth': 'Profundidad de Sondaje',
    'gingival_margin': 'Margen Gingival',
    'clinical_attachment': 'Nivel de Inserción Clínica',
    'bleeding_on_probing': 'Sangrado al Sondaje (BOP)',
    'plaque_index': 'Índice de Placa (PI)',
    'recession': 'Recesión',
    'mucogingival': 'Yunta Mucogingival',
    
    // Furcation grades
    'furcation_grade_1': 'Grado 1',
    'furcation_grade_2': 'Grado 2',
    'furcation_grade_3': 'Grado 3',
    
    // Implant status
    'implant_normal': 'Normal',
    'implant_warning': 'Advertencia',
    'implant_healthy': 'Saludable',
    
    // Messages
    'msg_save_success': 'Guardado correctamente',
    'msg_delete_confirm': '¿Está seguro de que desea eliminar este registro?',
    'msg_no_data': 'No hay datos clínicos',
    'storage_full_title': 'Almacenamiento del navegador lleno',
    'storage_full_text': 'Este registro NO se pudo guardar. Los registros guardados anteriormente no se ven afectados. Por favor, exporte sus datos ahora y elimine registros antiguos para liberar espacio.',
    
    // Voice commands
    'voice_start': 'Iniciar',
    'voice_stop': 'Detener',
    'voice_live_mode': 'En directo',
    'voice_batch_mode': 'Modo Batch',
  },
  
  'en-gb': { /* English translations */ },
  'de': { /* German translations */ },
  // ... other languages
};

export function t(key: string, defaultText?: string): string {
  const lang = getCurrentLanguage();
  return TRANSLATIONS[lang]?.[key] || defaultText || key;
}

function getCurrentLanguage(): LanguageCode {
  if (typeof window !== 'undefined') {
    return (window as any).currentLanguage || 'es';
  }
  return 'es';
}
```

---

## 11. Setup Instructions

### 11.1 Initialize Project

```bash
# Create Next.js project
npx create-next-app@latest periodontal-chart \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

cd periodontal-chart

# Install dependencies
npm install zustand immer @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  react-hook-form @hookform/resolvers zod \
  jspdf html2canvas xlsx \
  date-fns uuid \
  lucide-react clsx tailwind-merge

# Install dev dependencies
npm install -D @types/uuid vitest @testing-library/react @testing-library/jest-dom \
  playwright @playwright/test
```

### 11.2 Configure Tailwind (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          navy: '#000080',
          red: '#ef4444',
          blue: '#3b82f6',
          magenta: '#d011a6',
          amber: '#fbbf24',
          gray: '#F2F2F2',
          darkgray: '#828282',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

### 11.3 Copy Assets

```bash
# Copy images from original site
mkdir -p public/img/{implants,flags,logo}
# Download implant images (organized by quadrant and color)
# Download flag images
# Download logo
```

### 11.4 Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_APP_NAME="Periodontal Chart"
NEXT_PUBLIC_DEFAULT_LANGUAGE="es"
NEXT_PUBLIC_AUTO_SAVE_INTERVAL="30000"
```

---

## 12. Implementation Priority

### Phase 1: Core Infrastructure (Week 1)
- [ ] Project setup with Next.js + Tailwind + TypeScript
- [ ] Zustand stores (Patient, Chart, Settings, Overlay)
- [ ] LocalStorage persistence with migration
- [ ] Type definitions for clinical data
- [ ] Basic layout (Header, Sidebar, TabBar)

### Phase 2: Chart Rendering (Week 2)
- [ ] SVG coordinate system implementation
- [ ] PerioPolygon component with dynamic calculations
- [ ] ToothSurfaceSvg for BOP/PI coloring
- [ ] FurcationMarker and ImplantOverlay
- [ ] MissingToothDiagonal
- [ ] InterProximalPolygon

### Phase 3: Data Entry (Week 3)
- [ ] ToothTable component with all input fields
- [ ] RemoteControlPanel (BOP, Plaque, 5mm, 6mm+)
- [ ] Mobility/Furcation/Implant selectors
- [ ] Keyboard navigation (Tab, Arrow keys)
- [ ] Voice input integration

### Phase 4: Patient Management (Week 4)
- [ ] NavigationRenderer with patient/chart tree
- [ ] Drag-to-reorder (SortableJS)
- [ ] Chart overlay/comparison mode
- [ ] Export/Import (JSON, PDF, Excel)
- [ ] Settings modal

### Phase 5: Advanced Features (Week 5)
- [ ] General Health & Microbiology forms
- [ ] Classification/Interval/Calibration modals
- [ ] AI Prompt integration
- [ ] Profile management
- [ ] 3D view (Three.js)
- [ ] Comprehensive testing

---

## 13. Testing Strategy

### 13.1 Unit Tests (Vitest)

```typescript
// src/lib/utils/__tests__/clinicalCalculations.test.ts
import { calculateAL, calculateCAL, getRecessionClass } from '../clinicalCalculations';

describe('Clinical Calculations', () => {
  test('AL = PD - GM (non-inverted)', () => {
    expect(calculateAL(5, 2, false)).toBe(3);
  });
  
  test('AL = PD + GM (inverted)', () => {
    expect(calculateAL(5, -2, true)).toBe(3);
  });
  
  test('Furcation grade rendering', () => {
    expect(getFurcationSVG(1)).toContain('stroke="black"');
    expect(getFurcationSVG(3)).toContain('fill="black"');
  });
});
```

### 13.2 Integration Tests (Playwright)

```typescript
// tests/chart-workflow.spec.ts
test('Complete periodontal chart workflow', async ({ page }) => {
  await page.goto('/patients/new');
  await page.fill('[data-testid="patient-last-name"]', 'García');
  await page.fill('[data-testid="patient-first-name"]', 'María');
  await page.click('[data-testid="create-chart"]');
  
  // Enter probing depths
  await page.fill('[data-testid="pd_18_mb"]', '3');
  await page.fill('[data-testid="pd_18_b"]', '4');
  await page.fill('[data-testid="pd_18_db"]', '3');
  
  // Toggle BOP
  await page.click('[data-testid="bop_18_b"]');
  
  // Verify SVG updates
  await expect(page.locator('#surface-18b')).toHaveAttribute('fill', '#ef4444');
  
  // Save
  await page.click('[data-testid="save-button"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

---

## 14. Migration Notes from Original

### Key Behavioral Differences to Preserve

1. **Implant Visibility**: `ImplantOverlay` renders whenever `implant_X > 0`, independent of tooth presence. `MissingToothDiagonal` is hidden when an implant is present. The implant status (`implant_X`) is preserved even when the tooth is toggled off.

2. **AL Calculation**: `AL = PD - GM` (default) or `AL = PD + GM` (when GM inverted). Recalculated on every PD/GM change and on load if missing.

3. **Data Sorting**: Clinical data keys sorted by tooth order (FDI historic: 18→11, 21→28, 48→41, 31→38) then by prefix priority (tooth, implant, furcation, bop, pi, mobility, gi_sci, mgi_sci, pi_sci, mpi_sci, rec_y, rec_x, recMiller, recCairo, pt, width, cej, wsd, muc, gm, pd, al, note) then by surface order.

4. **Universal ↔ FDI Conversion**: Automatic detection and conversion on import/export.

5. **Auto-Save**: Debounced 30s interval, flush on manual save, quota exceeded handling with export prompt.

6. **Overlay Mode**: Read-only comparison of two charts with frozen inputs, Shift+Click to select.

7. **Voice Commands**: Spanish/English/German command recognition with custom training dictionary.

---

## 15. File Checklist

### Required Files to Create

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── patients/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   └── charts/
│   │   │   │       └── [chartId]/
│   │   │   │           └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (10+ shadcn components)
│   ├── layout/ (5 components)
│   ├── chart/ (12 components)
│   ├── forms/ (10+ components)
│   └── modals/ (3 components)
├── lib/
│   ├── store/ (4 stores)
│   ├── hooks/ (5 hooks)
│   ├── utils/ (7 utilities)
│   ├── constants/ (5 constant files)
│   └── types/ (4 type files)
├── styles/
└── middleware.ts
public/
├── img/
└── json/
```

---

## 16. Acceptance Criteria

### Functional Requirements
- [ ] Create/edit/delete patients and charts
- [ ] Record PD, GM, BOP, PI for all 32 teeth × 9 surfaces
- [ ] Record mobility (0-3), furcation (0-3), implant status (0-3)
- [ ] Visualize periodontal polygons (PD/GM/AL) in 4 SVG views
- [ ] Color tooth surfaces for BOP (red) and PI (blue)
- [ ] Toggle active indices (pockets, bone, furcation, etc.)
- [ ] Switch view status (PD/GM/AL)
- [ ] Toggle GM inversion and chart mirroring
- [ ] Voice input for hands-free charting
- [ ] Export to JSON, PDF, Excel
- [ ] Import from JSON
- [ ] Compare two charts (overlay mode)
- [ ] Auto-save with storage quota handling
- [ ] Multi-language support (14 languages)

### Technical Requirements
- [ ] TypeScript strict mode, no `any`
- [ ] React 18 concurrent features (useTransition, useDeferredValue)
- [ ] Zustand for global state, React Context for local
- [ ] Tailwind CSS for all styling
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Responsive (desktop ≥1024px, tablet 768-1023px)
- [ ] PWA-ready (service worker, manifest)
- [ ] Unit test coverage ≥80%
- [ ] E2E test coverage for critical workflows

---

## 17. References

- Original Application: https://www.periodontalchart-online.com/?lang=es
- REA Analysis: Browser capture, network inspection, static JS analysis
- Clinical Standards: 2017 World Workshop Classification, BOP/PI indices
- FDI Tooth Numbering: ISO 3950
- Universal Numbering: ADA system

---

*Generated from REA reverse-engineering analysis of periodontalchart-online.com*
*Specification Version: 1.0 | Date: 2024*
---

## 18. Exact SVG Tooth Vector Definitions

### Source of truth: background images for roots, inline SVG for crown surfaces

The reference application (`https://www.periodontalchart-online.com/?lang=es`) main chart does **not** use inline SVG tooth outlines; the natural roots and crowns are raster JPEGs. However, the site **does** expose exact inline SVG crown-surface paths in its surface editor (`#upper-svg`, `#lower-svg`) and in `#Ebene_1`. Those paths are documented in §19 and are the source for `src/lib/periodontal/toothSvgPaths.ts`. The chart SVG placeholder itself is empty:

```html
<div class="svg-placeholder" id="upper-svg-placeholder-01">
  <svg width="100%" height="100%" viewBox="0 0 790 162"></svg>
</div>
```

The tooth silhouettes are rendered as **JPEG background images** on the container `div`:

```html
<div class="background-image" src="img/jpg/ok-teeth-01.jpg">
  <div class="svg-placeholder" id="upper-svg-placeholder-01">
    <svg ...></svg>
  </div>
  ...
</div>
```

The four background images are:

| View | Background image | File in repo |
|---|---|---|
| `upper-svg-placeholder-01` (Vestibular Superior) | `img/jpg/ok-teeth-01.jpg` | `public/img/jpg/ok-teeth-01.jpg` |
| `upper-svg-placeholder-02` (Palatino Superior) | `img/jpg/ok-teeth-02.jpg` | `public/img/jpg/ok-teeth-02.jpg` |
| `lower-svg-placeholder-01` (Lingual Inferior) | `img/jpg/uk-teeth-01.jpg` | `public/img/jpg/uk-teeth-01.jpg` |
| `lower-svg-placeholder-02` (Vestibular Inferior) | `img/jpg/uk-teeth-02.jpg` | `public/img/jpg/uk-teeth-02.jpg` |

Image dimensions: 3248 × 652/653 px. Reference SVG viewBox: 790 × 162. The images are scaled to fill the container via CSS `background-size: 100% 100%`.

### Reference coordinate system

The reference app uses a different coordinate system than our implementation:

- **ViewBox**: `0 0 790 162` (vs. our `0 0 1800 361.33`)
- **Zero (CEJ) lines**: `upper-01: 106`, `upper-02: 53`, `lower-01: 108`, `lower-02: 61`
- **X coordinates**: per-tooth, per-surface (e.g. tooth 11: `db: 345, mb: 377, dp: 344, mp: 375`)

Our implementation keeps its own viewBox (`1800 × 361.33`) and coordinate system. The height matches the background JPG's natural aspect ratio (`(1800/3248) × 652`), so the JPG renders without vertical distortion — teeth keep their true proportions (the original `240`-unit height squashed them ~33%). This also makes app units isotropic with the JPG.

### Implementation notes

- `SvgPlaceholder.tsx` renders five explicit layers: JPG background (`z-1`), mm-line grid/CEJ (`z-2`), implant overlay (`z-3`), polygons/markers (`z-4`), and invisible interaction hitboxes (`z-5`). The implant overlay sits **above** the mm grid but **below** the GM/PD polygons, so the pocket fill and red/blue lines stay visible over implant PNGs. (Deliberate deviation from the site, which paints its mm lines over the implant markers — `.implant-marker` z-index 3 < `.svg-placeholder` z-index 5.)
- `ToothOutlineSvg` is **not mounted**. The JPG already contains the high-fidelity crowns and roots; drawing vector crowns caused double wireframes.
- `ImplantOverlay.tsx` renders the site's **actual PNG assets** (`public/img/implants/…`, copied from periodontalchart-online.com) for each `implant > 0` tooth, centered on the site's exact per-tooth anchor coordinates. Direction, length and width are baked into the PNGs per view (`b` buccal / `p` palatino / `l` lingual), so upper-01/01-views point up and palatino/02-views point down exactly like the reference site.
- The CEJ zero-reference line (`stroke="#f59e0b"`, `strokeWidth="1.5"`) is drawn at `config.zeroLineY`, which maps the site CEJ values (`106/53/108/61`) through `siteSvgYToApp()` — the measured site CSS box model (see §19.5): ≈ `231.71`, `113.89`, `236.15`, `131.67`.
- The mm grid reproduces the site's chart renderer (`js/renderer/chart_renderer.js:567-577`) exactly: 16 horizontal lines at 1 mm intervals (`POLYGON_SCALE = SITE_MM_SCALE × SITE_SVG_SCALE × SITE_DISPLAY_TO_APP = 6.45 × 787/790 × 1800/806.671875 ≈ 14.34` app units) starting at the CEJ and extending **into the root area only** — `upper-01`/`lower-01` upward (`rootDirection -1`), `upper-02`/`lower-02` downward (`rootDirection 1`); `stroke="#000"`, `strokeWidth 1.25`, full canvas width. No lines are drawn in the crown area. The last line(s) are clipped at the canvas edge exactly as on the site (e.g. `lower-02`'s 16th line falls past the bottom edge).
- `ToothSurfaceSvg.tsx` renders only invisible exact crown-surface hit paths. `ToothSurfaceMarkers.tsx` renders the visible BOP/PI markers in layer 4.

---

## Reverse-Engineered Implant Rendering (PNG overlays)

### Source of truth: per-tooth PNG chart overlays

The reference application (`https://www.periodontalchart-online.com/?lang=es`) renders implants in the **main chart** as **per-tooth PNG image overlays** positioned absolutely over the chart canvas (verified live with Puppeteer). The chart overlay markup is:

```html
<img class="implant-marker" id="implant_18_b" src="img/implants/1/18b.png" style="display: none;" />
```

The image path follows the pattern `img/implants/{status}/{quadrant}/{toothNumber}{site}.png` where:
- **status folder**: `""` = status 1 (gray), `r/` = status 2 (red/peri-implantitis), `g/` = status 3 (green/healthy)
- **quadrant**: FDI quadrant `1`–`4`
- **toothNumber**: FDI number (11-48)
- **site**: `b` (buccal/vestibular) or `p` (palatal) for upper teeth; `b` (buccal/vestibular) or `l` (lingual) for lower teeth

Each PNG is a complete implant drawing — abutment/crown silhouette plus threaded screw — pre-oriented, pre-lengthened and pre-colored for its exact tooth and view (e.g. `1/11b.png` is 62×137 with the screw pointing up; `1/11p.png` is 62×119 with the screw pointing down). The gray variants are RGBA; the red/green variants are opaque RGB on white and get a 4px top/bottom fade mask (`mask-image: linear-gradient(to bottom, transparent, black 4px, black calc(100% - 4px), transparent)`).

Anchors live in the site's `js/coordinates/implant_coordinates.js` (`implant_<tooth>_<site>` keys, 790×162 per-view space; y is constant per view: `57` upper-buccal, `105–106` upper-palatal, `54` lower-lingual, `112` lower-buccal). The site positions each marker with `position: absolute`, `transform: translate(-50%, -50%)` (the coordinate is the image **center**), natural pixel size, `z-index: 3`, `pointer-events: none`.

### Implementation in Dental Diamond Link

The app copies the site's rendering exactly:

1. **Assets**: all 192 PNGs (`64 teeth-views × 3 status folders`) are copied byte-for-byte into `public/img/implants/`.
2. **Data tables**: `components/periodontal/ImplantOverlay.tsx` contains `SITE_IMPLANT_COORDS` (the site's 64 anchor coordinates, verbatim) and `IMPLANT_PNG_SIZES` (the 64 natural pixel sizes).
3. **Coordinate mapping**: the site displays the 3248×652 JPG inside a 787×162.5 placeholder in an 806.67×166.56 box at `(-9, 0)` with `object-fit: contain` → displayed at 806.67×161.93 with its top edge at `y = 2.32`. The app stretches that same JPG edge-to-edge over an `1800×361.33` viewBox (the JPG's natural aspect), so site coordinates map with `x_ours = (x_site + 9) × 1800/806.67` and `y_ours = (y_site − 2.32) × 361.33/161.93`; PNG sizes scale by the same factors. This keeps the implant pixel-aligned with the drawn teeth it replaces.
4. **Rendering**: `<img>` centered at the mapped anchor with `transform: translate(-50%, -50%)`, `z-index: 3`, `pointer-events: none`, sized to the mapped natural dimensions. Status `2`/`3` select the `r/`/`g/` folders and apply the site's 4px fade mask. The `02` views (Palatino Superior, Vestibular Inferior) use the mirrored PNGs whose screws point down; the `01` views use the up-pointing PNGs — direction is baked into the assets, exactly as on the site.
5. **Conditional rendering**: The overlay renders whenever `implant_X > 0`, independent of tooth presence. `MissingToothDiagonal` is hidden when an implant is present, so an implant on an extracted tooth remains visible.

The vector implant icon reproduction (`src/lib/periodontal/implantVector.tsx`) was removed: the chart now uses the site's own assets, and the app's input row (`ArchDataGrid`) renders implant status as text, so no vector icon is needed.

### Implant status cycle
- `0`: No implant (natural root visible)
- `1`: Active implant (gray screw)
- `2`: Warning/peri-implantitis (red screw)
- `3`: Healthy integrated implant (green screw)

### Implant component locations
- `public/img/implants/` — all 192 site PNG assets (gray + `r/` red + `g/` green, per quadrant, per view suffix).
- `components/periodontal/ImplantOverlay.tsx` — site anchor coordinate table, PNG size table, JPG-faithful coordinate mapping, status folder/mask logic (layered at `z-3`, above the mm grid, below the GM/PD polygons).
- `components/periodontal/SvgPlaceholder.tsx` — five layers: background (`z-1`), mm-line grid/CEJ (`z-2`), implant overlay (`z-3`), polygons/markers (`z-4`), invisible interaction hitboxes (`z-5`).

---

## 19. Reverse-Engineered Vector Assets (periodontalchart-online.com)

**Source:** `https://www.periodontalchart-online.com/?lang=es`
**Method:** live DOM inspection, downloaded JS/CSS, Puppeteer rendering, byte comparison of images.
**Date:** 2026-11-11

### 19.1 Asset inventory

| Asset | Where the site uses it | Exact geometry | Repo implementation |
|---|---|---|---|
| `#upper-svg` | Surface editor row (upper arch) | Inline SVG, `viewBox="0 0 834 81"`, 64 paths | `src/lib/periodontal/toothSvgPaths.ts` |
| `#lower-svg` | Surface editor row (lower arch) | Inline SVG, `viewBox="0 0 834 81"`, 64 paths | `src/lib/periodontal/toothSvgPaths.ts` |
| `#Ebene_1` | Secondary surface diagram | Inline SVG, `viewBox="0 0 1000 300"`, 128 paths | Not used (duplicate of the two above) |
| `ok-teeth-01/02.jpg`, `uk-teeth-01/02.jpg` | Main chart background (roots + crowns) | 3248 × 652/653 px rasters | `public/img/jpg/` (byte-identical) |
| `img/implants/{status}/{q}/{tooth}{b,p,l}.png` | Main chart implant overlay | 192 PNGs; gray RGBA, red/green RGB-on-white | `public/img/implants/` (byte-identical), rendered by `components/periodontal/ImplantOverlay.tsx` |

### 19.2 Exact crown-surface paths (`#upper-svg`, `#lower-svg`)

The site's surface editor exposes the crown surfaces as 64 inline SVG paths:

- `#upper-svg`: teeth **18–28**, left→right, four paths per tooth: `p`, `b`, `d`, `m`.
- `#lower-svg`: teeth **48–38**, left→right, four paths per tooth: `l`, `b`, `d`, `m`.
- Path IDs follow `surface-<FDI><surface>`, e.g. `surface-18p`, `surface-48l`.
- The paths are **crown-only**. There are no root paths in either SVG. The natural roots exist only in the background JPGs.

Extracted data lives in `src/lib/periodontal/toothSvgPaths.ts`:

```ts
export const SITE_CROWN_VIEWBOX = { width: 834, height: 81 } as const;

export const SITE_TOOTH_CROWNS: Record<FDIToothNumber, SiteToothCrown> = {
  11: {
    arch: 'upper',
    cej: 'bottom',
    bbox: [368.4969, 7.0228, 417.6131, 51.9893],
    surfaces: { p: `...`, b: `...`, d: `...`, m: `...` },
  },
  // ... 32 teeth total
};
```

`SiteToothCrown` stores:

- `arch`: `'upper' | 'lower'`
- `cej`: `'bottom'` for upper, `'top'` for lower
- `bbox`: the exact path bounding box in the 834 × 81 coordinate system
- `surfaces`: the four exact `d` strings

#### Mapping into the app's local tooth coordinates

`getSiteCrownTransform(tooth, targetWidth, targetHeight)` maps the site bbox so that:

- the site bbox center x maps to local `x = 0`
- the site CEJ maps to local `y = 0`
- the site incisal/occlusal edge maps to local `y = +targetHeight`
- the site bbox width maps to `targetWidth`

```ts
const [x0, y0, x1, y1] = crown.bbox;
const siteWidth = x1 - x0;
const siteHeight = y1 - y0;
const scaleX = targetWidth / siteWidth;
const scaleY = targetHeight / siteHeight;
const centerX = (x0 + x1) / 2;
const cejY = crown.cej === 'top' ? y0 : y1;
const flipY = crown.cej === 'top' ? 1 : -1;
return `translate(${-centerX * scaleX} ${-cejY * scaleY * flipY}) scale(${scaleX} ${scaleY * flipY})`;
```

`ToothSurfaceSvg` (the invisible interaction layer) applies the existing outer transform:

```tsx
<g transform={`translate(${x} ${y}) scale(1 ${flip})`}>
  <g transform={crownTransform}>
    {surfaces.map(surface => <path d={d} fill="transparent" stroke="none" pointerEvents="all" ... />)}
  </g>
</g>
```

where `flip = rootDirection === 1 ? -1 : 1`. This yields:

- **Upper views:** site CEJ bottom → app CEJ; crown extends toward the occlusal plane (down in local coords).
- **Lower views:** site CEJ top → app CEJ; crown extends toward the occlusal plane (up in local coords after the outer flip).

The site's left→right order is the same as the app's view order (`18…28` and `48…38`). Each tooth is centered on its own bbox, so no additional mirroring is required.

### 19.3 `#Ebene_1` (secondary diagram)

`#Ebene_1` is `viewBox="0 0 1000 300"` with 128 paths, IDs `site_<FDI><surface>` (e.g. `site_18p`, `site_48l`). The shapes are the same crown surfaces translated/mirrored into a 1000 × 300 layout. It contains **no roots**. The canonical source for `toothSvgPaths.ts` is `#upper-svg`/`#lower-svg` because those are the site's per-arch surface editor row; `#Ebene_1` is documented for completeness and is not duplicated in the app.

### 19.4 Background JPGs (the only natural roots)

The four chart background images are byte-identical to the app's copies (MD5 match):

| View | Site file | App file | Dimensions |
|---|---|---|---|
| `upper-svg-placeholder-01` | `img/jpg/ok-teeth-01.jpg` | `public/img/jpg/ok-teeth-01.jpg` | 3248 × 652 |
| `upper-svg-placeholder-02` | `img/jpg/ok-teeth-02.jpg` | `public/img/jpg/ok-teeth-02.jpg` | 3248 × 652 |
| `lower-svg-placeholder-01` | `img/jpg/uk-teeth-01.jpg` | `public/img/jpg/uk-teeth-01.jpg` | 3248 × 653 |
| `lower-svg-placeholder-02` | `img/jpg/uk-teeth-02.jpg` | `public/img/jpg/uk-teeth-02.jpg` | 3248 × 653 |

Consequences:

- The natural root geometry is **raster**, not vector. The app does not attempt to redraw it.
- `ToothOutlineSvg` is **not mounted**: the JPG already contains the high-fidelity crowns and roots, and drawing vector crowns over it caused double wireframes.
- For an implant tooth, `ImplantOverlay` draws the site's own implant PNG (including its crown silhouette) over the tooth position — the same assets and anchors as the site, so no masking or vector reproduction is needed.

### 19.5 Implant PNGs (main chart overlay)

Main chart overlay pattern (verified live with Puppeteer):

```html
<img class="implant-marker" id="implant_18_b" src="img/implants/1/18b.png" />
```

- `img/implants/{status}/{q}/{tooth}{b|p|l}.png` with status folders `""` (gray/1), `r/` (red/2), `g/` (green/3).
- Each PNG is a complete implant (crown silhouette + threaded screw) pre-oriented per view: upper `b` PNGs point up, upper `p` PNGs point down, lower `l` PNGs point up, lower `b` PNGs point down. Example natural sizes: `1/18b.png` 60×137, `1/18p.png` 60×119, `3/38b.png` 80×131, `4/48b.png` 64×131; heights are constant per arch+suffix (137 upper-`b`, 119 upper-`p`, 131 lower-`b`, 133 lower-`l`).
- Gray variants are RGBA (transparent around the screw); red/green variants are opaque RGB on white — on the site their white box visibly covers the chart gridlines within the image box, and `.implant-marker-colored` applies a 4px top/bottom fade.
- Anchors from `js/coordinates/implant_coordinates.js`: `implant_<tooth>_<site>` → `{x, y}` in the 790×162 per-view space; y is constant per view (`57`/`105–106`/`54`/`112`). The marker is positioned `absolute` with `transform: translate(-50%, -50%)` (anchor = image center) at natural size, `z-index: 3`, `pointer-events: none`.
- Site rendering geometry (live-computed): placeholder `787 × 162.5` (the `height: 325px` CSS rule is overridden at runtime); JPG box `806.67 × 166.56` at `(-9, 0)` with `object-fit: contain` → JPG displayed `806.67 × 161.93`, top edge at `y = 2.32`; SVG `viewBox="0 0 790 162"` scaled `× 0.9962`, vertically centered (`top ≈ 0.55`).
- App mapping (`ImplantOverlay.tsx`): `x_ours = (x_site + 9) × 1800/806.671875`, `y_ours = (y_site − 2.32) × 361.33/161.93`; PNG sizes scale by the same factors (`× 2.2314` both axes — the canvas height equals the JPG aspect, so implant scaling is exactly isotropic). Spot values: `implant_11_b` → center `(832.1, 122.0)`, size `138.3 × 305.7`; `implant_18_b` → center `(78.1, 122.0)`.
- The app ships all 192 PNGs byte-identical in `public/img/implants/` and renders them at `z-3` (above the mm grid at `z-2`, below the GM/PD polygons at `z-4` so the lines and pocket fill stay visible over the PNGs — a deliberate deviation from the site, where `.implant-marker` z-index 3 paints below the `.svg-placeholder` z-index 5 SVG) with the site's centering, status folders and colored fade mask. No mask rectangle, no vector reproduction — direction/length/width come from the assets, exactly as on the site.

### 19.6 Reference CSS and chart geometry

```css
.chart-placeholder { width: 787px; height: 162.5px; }  /* live-computed; source CSS says 325px but is overridden */
.background-image {
  height: 102.5%;
  width: 102.5%;
  object-fit: contain;
  left: -9px;
  z-index: 1;
}
.implant-marker { position: absolute; transform: translate(-50%, -50%); pointer-events: none; z-index: 3; }
.implant-marker-colored {
  mask-image: linear-gradient(transparent, black 4px, black calc(100% - 4px), transparent);
  mask-repeat: no-repeat;
}
.svg-placeholder { z-index: 5; }
```

Reference chart geometry:

| Property | Site | App |
|---|---|---|
| ViewBox | `0 0 790 162` | `0 0 1800 361.33` (`(1800/3248) × 652` = JPG natural aspect, so the background renders unsquashed) |
| CEJ lines | `upper-01: 106`, `upper-02: 53`, `lower-01: 108`, `lower-02: 61` (SVG y units) | `siteSvgYToApp(site value)` — measured box model (`231.71`, `113.89`, `236.15`, `131.67`); the site letterboxes its SVG (`xMidYMid meet`, 787/790 scale, 0.5576px letterbox in the 162.5px slot) and its JPG (806.67×166.56 element, `object-fit: contain`, 2.3160px letterbox), so the mapping is `(y × 787/790 + 0.5576 − 2.3160) × 1800/806.671875`. Live-verified: the site's own mm lines put SVG y=106 on screen 954.155 → app y = 231.71 |
| Tooth pitch | per-tooth coordinates | `110` (uniform grid, hitboxes only; polygons use the site per-tooth x coordinates) |
| First tooth center | per-tooth coordinates | `65` (uniform grid, hitboxes only; polygons use the site per-tooth x coordinates) |
| mm grid | zero line + 16 lines at `6.45` units (1 mm) from the CEJ into the root area (`stroke="#000"`, `stroke-width="1.25"`, full width; drawn in `chart_renderer.js:567-577`) | `getMmLineYs(viewId)`: same scheme with `POLYGON_SCALE = 6.45 × 787/790 × 1800/806.671875 ≈ 14.34` app units, `stroke="#000"`, `strokeWidth 1.25`; black lines layer at `z-2` under the implant PNGs (`z-3`), per the app's requested paint order (see below) |

Paint order on the site: JPG (`z-index: 1`) → implant PNGs (`z-index: 3`) → SVG with mm lines/polygons (`z-index: 5`). The app follows the same layer stack but keeps the mm grid **below** the implants: JPG (`z-1`) → mm-line grid/CEJ SVG (`z-2`) → implant overlay (`z-3`) → GM/PD polygons/markers (`z-4`) → hitboxes (`z-5`). This keeps the pocket fill and red/blue lines visible over implant PNGs (a deliberate deviation requested for the app; on the site the mm lines cross over the implant markers).

The site's main chart renders the background JPG plus PNG implant overlays; it does **not** overlay the crown-surface SVG on the chart. The app renders the same background JPG, the site's own PNG implant overlays, and uses the exact site crown geometry only as **invisible interaction hitboxes** in layer 5 — no vector outlines are drawn over the raster teeth. The roots remain the site's raster roots.

### 19.6b GM/PD/AL polygons and the attachment-level calculation

Source of truth: `js/renderer/chart_renderer.js` (`renderPerioPolygon`, `renderInterPolygons`) and `js/coordinates/polygon_coordinates.js` (`polygonZeroLines`, `xCoordMap`).

- **X coordinates.** Per tooth and surface, hand-calibrated in site SVG space (e.g. tooth 11 `db: 345, mb: 377, dp: 344, mp: 375`; tooth 18 `db: 12`). Central surfaces are computed midpoints: `b = (db+mb)/2`, `p = (dp+mp)/2`, `l = (dl+ml)/2`. The app stores the full table as `SITE_X_COORDINATES` (chartGeometry.ts) and maps to canvas space with `siteSvgXToApp: (x × 787/790 + 9) × 1800/806.671875` (SVG displayed 787px wide, left edge 9px right of the JPG's). Live-verified: the tooth-11 GM line's SVG x=345 lands exactly on measured screen x=969.94.
- **Y formulas.** `scale = 6.45` site units/mm, `zeroLineY = polygonZeroLines[svgId]` (106/53/108/61); upper-01/lower-01: `gmY = zero + adjustedGm×scale`, `pdY = gmY − pd×scale`, `mucY = gmY − muc×scale`; upper-02/lower-02: all signs flipped. `adjustedGm = isGmInverted ? −gm : gm`. **No clamping** — negative GM renders apical/coronal exactly as entered.
- **Colors/strokes.** polygon fill `#000080` opacity `0.5`; PD polyline `blue` (`#0000ff`); GM polyline `red` (`#ff0000`); muc polyline `#D011A6`; all `stroke-width="3"` (≈3px on screen), solid — only the app's Neubefund overlay is dashed. Per-tooth stack: polygon → PD → muc (only when `active_indices.muc`) → GM. Interdental: same shapes plus continuous `inter-gm`/`inter-pd` polylines between adjacent present teeth; pairs `11→21` and `41→31` are skipped. Both renderers have **no all-zero data gate** — flat CEJ lines draw for every present tooth.
- **AL (Nivel de inserción).** The site's AL inputs are `readonly`; the value auto-calculates on every PD/GM input (`js/script.js calculateSingleALForInput`) and when loading data without `al_` keys (`js/renderer/data_renderer.js`): `AL = PD − GM` (normal mode) or `AL = PD + GM` (GM-inverted mode, where the stored GM is the negated display value). The app mirrors this in `calculateAL` (types/clinical.ts) and `getToothAl` (periodontalAnalysis.ts), recomputing on every `pd_`/`gm_` field change.
- **Input validation.** Site inputs are text fields: GM range `−99..99` (`data-validation-type="-99-99"`), PD `0..99` (`"0-99"`), integers only. The app's ArchDataGrid mirrors the ranges with number inputs (GM `min −99 max 99`, PD `min 0 max 99`, `step 1`). So **GM takes negative values (hyperplasia), PD does not** — matching the site exactly.
- **Default convention.** `isGmInverted` defaults to the site's locale check (`isUSA`): `false` for lang=es, so positive GM = recession and `AL = PD − GM`. The app's store default is now `false` to match.
- **Anatomical site order.** The site's per-tooth input DOM order is distal-first for Q1/Q4 (teeth 18-11, 48-41: `[db,b,mb]` / `[dp,p,mp]` / `[dl,l,ml]`) and mesial-first for Q2/Q3 (teeth 21-28, 31-38: `[mb,b,db]` / `[mp,p,dp]` / `[ml,l,dl]`) — live-verified. `ArchDataGrid` mirrors this: the vestibular/palatal/lingual column groups read `VD|VMe|VM` / `PD|PMe|PM` / `LD|LMe|LM` left-to-right for Q1/Q4 and `VM|VMe|VD` / `PM|PMe|PD` / `LM|LMe|LD` for Q2/Q3 (`sitesFor` reverses the surface order for Q1/Q4 teeth). The chart polylines are already anatomically ordered via `SITE_X_COORDINATES` (Q1: `db < b < mb` ascending, Q2: `mb < b < db`).

### 19.7 Verification

```bash
npx tsc --noEmit
npx eslint components/periodontal/SvgPlaceholder.tsx components/periodontal/ImplantOverlay.tsx components/periodontal/ToothSurfaceSvg.tsx components/periodontal/ToothSurfaceMarkers.tsx src/lib/periodontal/toothSvgPaths.ts src/lib/utils/toothAnatomy.ts src/lib/utils/chartGeometry.ts
node scripts/verify-periodontal.cjs
```

The verification script checks:

- all 32 teeth have four exact crown paths
- each crown transform maps the site bbox to the target width/height with the CEJ at `y=0`
- upper CEJ is `bottom`, lower CEJ is `top`
- `toothAnatomy.ts` contains no procedural crown/root path builders
- `ImplantOverlay` carries the site's 64 anchor coordinates (spot-checked against `implant_coordinates.js`) and 64 PNG sizes, references `/img/implants/`, centers with `translate(-50%, -50%)`, maps `p`/`l` suffixes per view, picks `r/`/`g/` folders by status, and applies the 4px colored fade mask
- all 192 implant PNGs exist in `public/img/implants/` (gray + `r/` + `g/`) and every base PNG's IHDR dimensions match the size table
- the canvas viewBox is `1800 × 361.33` — the background JPG's natural aspect — so teeth render unsquashed, and `POLYGON_SCALE` scales the site's 6.45 units/mm into app units
- the CEJ anchor uses the measured site box model (`siteSvgYToApp`): slot-level SVG letterbox `0.5576px` and JPG `object-fit: contain` letterbox `2.3160px`, giving zeroLineY ≈ `231.71`/`113.89`/`236.15`/`131.67` — live-verified against the site's own mm lines (SVG y=106 → screen 954.155 → app 231.71)
- `SvgPlaceholder` keeps the five layers (`z-1` background, `z-2` mm-line grid/CEJ, `z-3` implant overlay, `z-4` polygons/markers, `z-5` hitboxes) with the implant layer **above** the mm grid and **below** the polygon layer (app paint order; the site paints mm lines over the implants), does not mount `ToothOutlineSvg`, draws the mm lines via `getMmLineYs` (black `#000`, width `1.25`, root area only), and keeps the amber zero line
- `ToothSurfaceSvg` renders only invisible exact crown-surface hit paths; `ToothSurfaceMarkers` keeps BOP/PI markers non-interactive
- `chartGeometry` carries the site `SITE_X_COORDINATES` for all 32 teeth (spot-checked against `polygon_coordinates.js`) and `siteSvgXToApp`/`siteSvgYToApp` reproduce the measured site transforms (x: `(x×787/790 + 9) × 1800/806.671875` → 345 → 786.97; y: slot letterbox `0.5576`, JPG letterbox `2.3160` → 106 → 231.71)
- `PerioPolygon`/`InterProximalPolygon` use the site colors (`#0000ff` PD, `#ff0000` GM, `#D011A6` muc), `fill-opacity 0.5`, `stroke-width 3`, solid lines, no data gate, muc only when muc data exists, interdental GM/PD lines continuous, midline pairs skipped
- `calculateAL`/`getToothAl` implement the site formula `AL = PD − GM` (inverted mode flips the GM sign), the store defaults `isGmInverted: false`, and ArchDataGrid applies the site input ranges (GM −99..99, PD 0..99, step 1)
- ArchDataGrid orders its columns anatomically per quadrant (Q1/Q4 distal-first with `VD|VMe|VM`-style labels, Q2/Q3 mesial-first) matching the site's per-tooth DOM order, and `SvgPlaceholder` paints polygons (`z-4`) above implants (`z-3`) so the red/blue lines and pocket fill stay visible over implant PNGs
