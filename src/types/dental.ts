// Dental Xray System Types

export interface DentalStudy {
  id: string;
  patient_id: string;
  study_date: string;
  actual_study_date?: string;
  study_type: string;
  study_number?: number;
  directory_name?: string;
  description?: string;
  notes?: string;
  doctor_id?: string;
  doctor_name?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: {
    nombre_completo: string;
    numero_identidad: string;
    telefono?: string;
    fecha_nacimiento?: string;
    sexo?: string;
    doctor?: string;
  };
  images?: DentalImage[];
  annotations?: DentalAnnotation[];
  reports?: DentalReport[];
  // Computed fields
  image_count?: number;
  latest_study_date?: string;
  thumbnail_url?: string;
}

export interface DentalImage {
  id: string;
  study_id: string;
  patient_id: string;
  image_url: string;
  public_url?: string;
  image_name: string;
  image_path?: string;
  image_type: string;
  file_size: number;
  width?: number;
  height?: number;
  capture_date: string;
  description?: string;
  position?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  study?: DentalStudy;
  patient?: {
    nombre_completo: string;
    numero_identidad: string;
  };
}

export interface DentalAnnotation {
  id: string;
  image_id: string;
  study_id: string;
  patient_id: string;
  annotation_type: string;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description: string;
  severity?: 'low' | 'medium' | 'high';
  doctor_id?: string;
  doctor_name?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  image?: DentalImage;
  study?: DentalStudy;
  patient?: {
    nombre_completo: string;
    numero_identidad: string;
  };
}

export interface DentalReport {
  id: string;
  study_id: string;
  patient_id: string;
  report_type: string;
  title: string;
  content: string;
  findings?: string;
  recommendations?: string;
  doctor_id?: string;
  doctor_name?: string;
  status: 'draft' | 'completed' | 'reviewed';
  created_at: string;
  updated_at: string;
  // Joined fields
  study?: DentalStudy;
  patient?: {
    nombre_completo: string;
    numero_identidad: string;
  };
}

// Patient Xray Summary for card view
export interface PatientXraySummary {
  patient_id: string;
  nombre_completo: string;
  numero_identidad: string;
  telefono?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  doctor?: string;
  study_count: number;
  latest_study_date: string;
  thumbnail_url?: string;
  latest_study_type?: string;
  total_images: number;
}

// Xray Viewer Page State
export interface XrayViewerState {
  patients: PatientXraySummary[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  currentPage: number;
  recordsPerPage: number;
  viewMode: 'grid' | 'list';
  sortBy: 'nombre' | 'fecha' | 'estudios';
  sortOrder: 'asc' | 'desc';
  totalPatients: number;
}

// Image Preview State
export interface ImagePreviewState {
  images: DentalImage[];
  currentIndex: number;
  isOpen: boolean;
  zoom: number;
  pan: { x: number; y: number };
  isFullscreen: boolean;
}

// Study Group for detailed view
export interface StudyGroup {
  date: string;
  studies: DentalStudy[];
  imageCount: number;
  isExpanded: boolean;
}

// Filter Options
export interface XrayFilterOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  studyTypes?: string[];
  doctors?: string[];
  hasAnnotations?: boolean;
  hasReports?: boolean;
}
