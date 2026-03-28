export interface Odontogram {
  id?: string;
  paciente_id: string;
  version: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  creado_por?: string;
  notas?: string;
  datos_odontograma: OdontogramData;
  activo: boolean;
}

export interface OdontogramData {
  // Estructura de dientes - cada diente puede tener múltiples caras
  dientes: Record<string, DienteData>;
  // Información general del odontograma
  informacion_general?: {
    fecha: string;
    motivo_consulta: string;
    observaciones: string;
  };
  // Tratamientos planificados
  tratamientos_planificados?: Tratamiento[];
  // Diagnósticos
  diagnosticos?: Diagnostico[];
}

export interface DienteData {
  numero: string; // 11, 12, 13, etc.
  estado: 'sano' | 'caries' | 'obturado' | 'extraccion' | 'ausente' | 'corona' | 'puente' | 'implante' | 'endodoncia' | 'fracturado' | 'sellante';
  caras: {
    oclusal?: CaraDiente;
    vestibular?: CaraDiente;
    lingual_palatino?: CaraDiente;
    mesial?: CaraDiente;
    distal?: CaraDiente;
    cervical?: CaraDiente;
  };
  observaciones?: string;
  tratamiento?: string;
}

export interface CaraDiente {
  estado: 'sano' | 'caries' | 'obturado' | 'fracturado' | 'abrasion' | 'erosion' | 'hipoplasia' | 'mancha' | 'sellante';
  tratamiento?: string;
  observaciones?: string;
}

export interface Tratamiento {
  id: string;
  diente: string;
  cara?: string;
  tipo: 'restauracion' | 'endodoncia' | 'extraccion' | 'corona' | 'puente' | 'implante' | 'sellante' | 'profilaxis' | 'otro';
  descripcion: string;
  estado: 'planificado' | 'en_progreso' | 'completado' | 'cancelado';
  fecha_planificacion?: string;
  fecha_completado?: string;
  costo?: number;
}

export interface Diagnostico {
  id: string;
  codigo: string; // Código CIE o similar
  descripcion: string;
  dientes_afectados: string[];
  gravedad: 'leve' | 'moderado' | 'severo';
  fecha: string;
}

// Para el historial de odontogramas
export interface OdontogramHistory {
  odontograma: Odontogram;
  es_version_actual: boolean;
}

// Para la vista simplificada del paciente
export interface PacienteResumido {
  paciente_id: string;
  nombre_completo: string;
  numero_identidad: string;
}
