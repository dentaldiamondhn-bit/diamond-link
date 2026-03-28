-- Add versioning and progress tracking to historia_clinica_ortodoncia
-- First, add progress tracking to main table
ALTER TABLE historia_clinica_ortodoncia 
ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN current_version INTEGER DEFAULT 1,
ADD COLUMN total_estimated_appointments INTEGER DEFAULT 12,
ADD COLUMN completed_appointments INTEGER DEFAULT 0;

-- Create versions table for historical tracking
CREATE TABLE historia_clinica_ortodoncia_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  original_record_id UUID REFERENCES historia_clinica_ortodoncia(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  record_date DATE, -- For historical transcription
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
  notes TEXT, -- Version notes for changes
  UNIQUE(patient_id, version_number)
);

-- Create index for better performance
CREATE INDEX idx_orthodoncia_versions_patient_id ON historia_clinica_ortodoncia_versions(patient_id);
CREATE INDEX idx_orthodoncia_versions_created_at ON historia_clinica_ortodoncia_versions(created_at DESC);
CREATE INDEX idx_orthodoncia_versions_current ON historia_clinica_ortodoncia_versions(patient_id, is_current);

-- Add RLS policies
ALTER TABLE historia_clinica_ortodoncia_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orthodontic versions" ON historia_clinica_ortodoncia_versions
  FOR SELECT USING (
    paciente_id IN (
      SELECT id::text FROM patients 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own orthodontic versions" ON historia_clinica_ortodoncia_versions
  FOR INSERT WITH CHECK (
    paciente_id IN (
      SELECT id::text FROM patients 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own orthodontic versions" ON historia_clinica_ortodoncia_versions
  FOR UPDATE USING (
    paciente_id IN (
      SELECT id::text FROM patients 
      WHERE user_id = auth.uid()
    )
  );

-- Function to create new version
CREATE OR REPLACE FUNCTION create_orthodontic_version(
  p_patient_id TEXT,
  p_version_number INTEGER,
  p_record_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_is_current BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_current_record_id UUID;
BEGIN
  -- Get current record ID
  SELECT id INTO v_current_record_id
  FROM historia_clinica_ortodoncia
  WHERE paciente_id = p_patient_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create new version
  INSERT INTO historia_clinica_ortodoncia_versions (
    patient_id,
    original_record_id,
    version_number,
    record_date,
    is_current,
    notes,
    created_by,
    -- Copy all current data
    paciente_id, doctor_id, motivo_consulta_ortodoncia, diagnostico_ortodoncia,
    plan_tratamiento_ortodoncia, tipo_mordida, tipo_aparato, duracion_tratamiento,
    fecha_inicio_tratamiento, fecha_fin_tratamiento, observaciones_ortodoncia,
    radiografias_realizadas, modelos_estudio, analisis_cefalometrico,
    extracciones_realizadas, retenedor_tipo, retenedor_uso, seguimiento_post_tratamiento,
    documentos_ortodoncia, firma_digital_ortodoncia, progress_percentage,
    total_estimated_appointments, completed_appointments
  )
  SELECT 
    p_patient_id,
    v_current_record_id,
    p_version_number,
    p_record_date,
    p_is_current,
    p_notes,
    auth.uid()::text,
    paciente_id, doctor_id, motivo_consulta_ortodoncia, diagnostico_ortodoncia,
    plan_tratamiento_ortodoncia, tipo_mordida, tipo_aparato, duracion_tratamiento,
    fecha_inicio_tratamiento, fecha_fin_tratamiento, observaciones_ortodoncia,
    radiografias_realizadas, modelos_estudio, analisis_cefalometrico,
    extracciones_realizadas, retenedor_tipo, retenedor_uso, seguimiento_post_tratamiento,
    documentos_ortodoncia, firma_digital_ortodoncia, progress_percentage,
    total_estimated_appointments, completed_appointments
  FROM historia_clinica_ortodoncia
  WHERE paciente_id = p_patient_id
  ORDER BY created_at DESC
  LIMIT 1
  RETURNING id INTO v_version_id;
  
  -- If this is the current version, update other versions
  IF p_is_current THEN
    UPDATE historia_clinica_ortodoncia_versions 
    SET is_current = false 
    WHERE patient_id = p_patient_id AND id != v_version_id;
    
    -- Update main record
    UPDATE historia_clinica_ortodoncia 
    SET current_version = p_version_number,
        progress_percentage = (SELECT progress_percentage FROM historia_clinica_ortodoncia_versions WHERE id = v_version_id),
        completed_appointments = (SELECT completed_appointments FROM historia_clinica_ortodoncia_versions WHERE id = v_version_id)
    WHERE paciente_id = p_patient_id;
  END IF;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
