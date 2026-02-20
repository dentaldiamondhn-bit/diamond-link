export interface OrthodonticHistory {
  id?: string;
  paciente_id: string;
  doctor_id: string;
  nombre_completo: string;
  edad?: number;
  fecha_nacimiento?: string;
  sexo?: string;
  
  // Orthodontic-specific fields
  motivo_consulta_ortodoncia?: string;
  diagnostico_ortodoncia?: string;
  plan_tratamiento_ortodoncia?: string;
  tipo_mordida?: 'clase_i' | 'clase_ii' | 'clase_iii' | 'mordida_abierta' | 'mordida_cruzada' | 'mordida_profunda';
  tipo_aparato?: 'brackets_metalicos' | 'brackets_ceramicos' | 'brackets_zafiro' | 'invisalign' | 'aparato_removible' | 'expansion_palatina' | 'mantenedor_espacio';
  duracion_tratamiento?: string;
  fecha_inicio_tratamiento?: string;
  fecha_fin_tratamiento?: string;
  observaciones_ortodoncia?: string;
  radiografias_realizadas?: 'panoramica' | 'periapical' | 'oclusal' | 'lateral_craneo' | 'todas';
  modelos_estudio?: 'si' | 'no' | 'en_proceso';
  analisis_cefalometrico?: string;
  extracciones_realizadas?: string;
  retenedor_tipo?: 'fijo' | 'removible' | 'hawley' | 'invisible' | 'sin_retenedor';
  retenedor_uso?: 'tiempo_completo' | 'noche' | 'ocasional' | 'no_usa';
  seguimiento_post_tratamiento?: string;
  
  // Documents and signature
  documentos_ortodoncia?: string[];
  firma_digital_ortodoncia?: string | null;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}
