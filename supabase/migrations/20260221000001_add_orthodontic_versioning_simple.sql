-- Add progress tracking to main historia_clinica_ortodoncia table
ALTER TABLE historia_clinica_ortodoncia 
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_estimated_appointments INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS completed_appointments INTEGER DEFAULT 0;

-- Create versions table for historical tracking
CREATE TABLE IF NOT EXISTS historia_clinica_ortodoncia_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  original_record_id UUID REFERENCES historia_clinica_ortodoncia(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  record_date DATE,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  is_current BOOLEAN DEFAULT false,
  
  -- Copy all existing fields from historia_clinica_ortodoncia
  paciente_id TEXT,
  doctor_id TEXT,
  motivo_consulta_ortodoncia TEXT,
  diagnostico_ortodoncia TEXT,
  plan_tratamiento_ortodoncia TEXT,
  tipo_mordida TEXT CHECK (tipo_mordida IN ('clase_i', 'clase_ii', 'clase_iii', 'mordida_abierta', 'mordida_cruzada', 'mordida_profunda')),
  tipo_aparato TEXT CHECK (tipo_aparato IN ('brackets_metalicos', 'brackets_ceramicos', 'brackets_zafiro', 'invisalign', 'aparato_removible', 'expansion_palatina', 'mantenedor_espacio')),
  duracion_tratamiento TEXT,
  fecha_inicio_tratamiento DATE,
  fecha_fin_tratamiento DATE,
  observaciones_ortodoncia TEXT,
  radiografias_realizadas TEXT,
  modelos_estudio TEXT,
  analisis_cefalometrico TEXT,
  extracciones_realizadas TEXT,
  retenedor_tipo TEXT,
  retenedor_uso TEXT,
  seguimiento_post_tratamiento TEXT,
  documentos_ortodoncia TEXT[],
  firma_digital_ortodoncia TEXT,
  
  -- Progress tracking fields
  total_estimated_appointments INTEGER DEFAULT 12,
  completed_appointments INTEGER DEFAULT 0,
  
  -- Metadata
  created_by TEXT,
  notes TEXT,
  UNIQUE(patient_id, version_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orthodoncia_versions_patient_id ON historia_clinica_ortodoncia_versions(patient_id);
CREATE INDEX IF NOT EXISTS idx_orthodoncia_versions_created_at ON historia_clinica_ortodoncia_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orthodoncia_versions_current ON historia_clinica_ortodoncia_versions(patient_id, is_current);
