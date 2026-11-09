import { ChartData } from './clinical';

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
  activeRemoteControl: RemoteControlMode;
  activeContainer: ContainerView;
  navigationHidden: boolean;
  sortDirection: 'fav_asc' | 'fav_desc' | 'date_asc' | 'date_desc' | 'none';
  activePatientId: string | null;
  activeChartId: string | null;
  latestChartId: string | null;
  overlayData: ChartData | null;
  mainData: ChartData | null;
  mainMicroData: any | null;
  overlayMicroData: any | null;
  selectedChartIdsForOverlay: string[];
  currentLoadedData: ChartData | null;
  lastSavedPerioData: string | null;
  micMode: 'live' | 'batch';
  micTranscript: string;
  micTraining: Record<string, string>;
  openModals: string[];
  toasts: Toast[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}