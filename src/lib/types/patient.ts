import { ChartData } from './clinical';

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
  date: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_dob: string;
  clinician: string;
  initial_exam: boolean;
  reevaluation: boolean;
  reevaluation_note: string;
  json_data: string;
  created_at: string;
}

export interface AppData {
  patients: Patient[];
  settings: UserSettings;
}

export interface UserSettings {
  isGmInverted: boolean;
  dateFormat: 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  language: LanguageCode;
  autoSaveInterval: number;
  showTooltips: boolean;
  compactMode: boolean;
}

export type LanguageCode =
  | 'en-gb' | 'en-us' | 'de' | 'fr' | 'it' | 'es'
  | 'eu' | 'pt-br' | 'pt-pt' | 'pl' | 'dk' | 'ro' | 'bg';