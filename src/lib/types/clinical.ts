// Surface identifiers (9 surfaces per tooth)
export type SurfaceId =
  | 'mb' | 'b' | 'db'
  | 'mp' | 'p' | 'dp'
  | 'ml' | 'l' | 'dl';

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
export type UniversalToothNumber =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16
  | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32;

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
  tooth: BinaryIndex;
  mobility: MobilityGrade;
  furcation_b?: FurcationGrade;
  furcation_dp?: FurcationGrade;
  furcation_mp?: FurcationGrade;
  furcation_l?: FurcationGrade;
  furcation_p?: FurcationGrade;
  implant: ImplantStatus;
  bop_mb: BinaryIndex;
  bop_b: BinaryIndex;
  bop_db: BinaryIndex;
  bop_mp: BinaryIndex;
  bop_p: BinaryIndex;
  bop_dp: BinaryIndex;
  bop_ml: BinaryIndex;
  bop_l: BinaryIndex;
  bop_dl: BinaryIndex;
  pi_mb: BinaryIndex;
  pi_b: BinaryIndex;
  pi_db: BinaryIndex;
  pi_mp: BinaryIndex;
  pi_p: BinaryIndex;
  pi_dp: BinaryIndex;
  pi_ml: BinaryIndex;
  pi_l: BinaryIndex;
  pi_dl: BinaryIndex;
  gm_mb: number;
  gm_b: number;
  gm_db: number;
  gm_mp: number;
  gm_p: number;
  gm_dp: number;
  gm_ml: number;
  gm_l: number;
  gm_dl: number;
  pd_mb: number;
  pd_b: number;
  pd_db: number;
  pd_mp: number;
  pd_p: number;
  pd_dp: number;
  pd_ml: number;
  pd_l: number;
  pd_dl: number;
  al_mb: number;
  al_b: number;
  al_db: number;
  al_mp: number;
  al_p: number;
  al_dp: number;
  al_ml: number;
  al_l: number;
  al_dl: number;
  muc_mb?: number;
  muc_b?: number;
  muc_db?: number;
  muc_mp?: number;
  muc_p?: number;
  muc_dp?: number;
  muc_ml?: number;
  muc_l?: number;
  muc_dl?: number;
  rec_y?: number;
  rec_x?: number;
  recMiller?: string;
  recCairo?: string;
  pt?: number;
  width?: number;
  cej?: number;
  wsd?: number;
  gi_sci?: number;
  mgi_sci?: number;
  pi_sci?: number;
  mpi_sci?: number;
  note: string;
}

// Complete chart data
export interface ChartData {
  date_saved: string;
  url: string;
  copyright: string;
  date: string;
  patient_number: string;
  patient_last_name: string;
  patient_first_name: string;
  patient_dob: string;
  initial_exam: BinaryIndex;
  reevaluation: BinaryIndex;
  reevaluation_note: string;
  clinician: string;
  viewStatus: ViewStatus;
  isGmInverted: boolean;
  isMirrored: boolean;
  active_indices: ActiveIndices;
  chart_id?: string;
  patient_id?: string;
  created_at?: string;
  [key: string]: any;
}

export const CHART_TEMPLATE: ChartData = {
  date_saved: '',
  url: 'periodontalchart-online.ch',
  copyright: 'Dental Diamond Link (2026)',
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
  // Matches the site's lang=es default (isGmInverted false) and the chart
  // store's canonical flag, so AL = PD - GM everywhere.
  isGmInverted: false,
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

export function calculateAL(pd: number, gm: number, isGmInverted: boolean): number {
  return isGmInverted ? pd + gm : pd - gm;
}

export function calculatePlaqueIndex(data: Record<string, any>, teeth: FDIToothNumber[]): number {
  let totalSites = 0;
  let positiveSites = 0;

  teeth.forEach(tooth => {
    const surfaces = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];
    const isPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;
    if (!isPresent) return;

    surfaces.forEach(surface => {
      const key = `pi_${tooth}_${surface}`;
      const value = data[key];
      if (value !== undefined && value !== null) {
        totalSites++;
        if (value === '1' || value === 1) positiveSites++;
      }
    });
  });

  return totalSites > 0 ? Math.round((positiveSites / totalSites) * 100 * 10) / 10 : 0;
}

export function calculateBopIndex(data: Record<string, any>, teeth: FDIToothNumber[]): number {
  let totalSites = 0;
  let positiveSites = 0;

  teeth.forEach(tooth => {
    const surfaces = ['mb', 'b', 'db', 'mp', 'p', 'dp', 'ml', 'l', 'dl'];
    const isPresent = data[`tooth_${tooth}`] === '1' || data[`tooth_${tooth}`] === 1;
    if (!isPresent) return;

    surfaces.forEach(surface => {
      const key = `bop_${tooth}_${surface}`;
      const value = data[key];
      if (value !== undefined && value !== null) {
        totalSites++;
        if (value === '1' || value === 1) positiveSites++;
      }
    });
  });

  return totalSites > 0 ? Math.round((positiveSites / totalSites) * 100 * 10) / 10 : 0;
}

export const DEFAULT_ACTIVE_INDICES = {
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
};