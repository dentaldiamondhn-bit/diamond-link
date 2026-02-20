-- Migration to create historia_clinica_ortodoncia table
-- This table stores orthodontic-specific clinical history for patients

-- Create the historia_clinica_ortodoncia table
CREATE TABLE IF NOT EXISTS historia_clinica_ortodoncia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES patients(paciente_id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL,
    
    -- Basic patient info (redundant but for convenience)
    nombre_completo TEXT,
    edad INTEGER,
    fecha_nacimiento DATE,
    sexo TEXT,
    
    -- Orthodontic-specific fields
    motivo_consulta_ortodoncia TEXT,
    diagnostico_ortodoncia TEXT,
    plan_tratamiento_ortodoncia TEXT,
    tipo_mordida TEXT CHECK (tipo_mordida IN ('clase_i', 'clase_ii', 'clase_iii', 'mordida_abierta', 'mordida_cruzada', 'mordida_profunda')),
    tipo_aparato TEXT CHECK (tipo_aparato IN ('brackets_metalicos', 'brackets_ceramicos', 'brackets_zafiro', 'invisalign', 'aparato_removible', 'expansion_palatina', 'mantenedor_espacio')),
    duracion_tratamiento TEXT,
    fecha_inicio_tratamiento DATE,
    fecha_fin_tratamiento DATE,
    observaciones_ortodoncia TEXT,
    radiografias_realizadas TEXT CHECK (radiografias_realizadas IN ('panoramica', 'periapical', 'oclusal', 'lateral_craneo', 'todas')),
    modelos_estudio TEXT CHECK (modelos_estudio IN ('si', 'no', 'en_proceso')),
    analisis_cefalometrico TEXT,
    extracciones_realizadas TEXT,
    retenedor_tipo TEXT CHECK (retenedor_tipo IN ('fijo', 'removible', 'hawley', 'invisible', 'sin_retenedor')),
    retenedor_uso TEXT CHECK (retenedor_uso IN ('tiempo_completo', 'noche', 'ocasional', 'no_usa')),
    seguimiento_post_tratamiento TEXT,
    
    -- Documents and signature
    documentos_ortodoncia TEXT[] DEFAULT '{}',
    firma_digital_ortodoncia TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_historia_clinica_ortodoncia_paciente_id ON historia_clinica_ortodoncia(paciente_id);
CREATE INDEX IF NOT EXISTS idx_historia_clinica_ortodoncia_doctor_id ON historia_clinica_ortodoncia(doctor_id);
CREATE INDEX IF NOT EXISTS idx_historia_clinica_ortodoncia_created_at ON historia_clinica_ortodoncia(created_at);

-- Create RLS (Row Level Security) policies
ALTER TABLE historia_clinica_ortodoncia ENABLE ROW LEVEL SECURITY;

-- Policy to allow doctors to see their own patients' orthodontic history
CREATE POLICY "Doctors can view their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR SELECT
    USING (
        auth.uid() = doctor_id
    );

-- Policy to allow doctors to insert their own patients' orthodontic history
CREATE POLICY "Doctors can insert their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR INSERT
    WITH CHECK (
        auth.uid() = doctor_id
    );

-- Policy to allow doctors to update their own patients' orthodontic history
CREATE POLICY "Doctors can update their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR UPDATE
    USING (
        auth.uid() = doctor_id
    )
    WITH CHECK (
        auth.uid() = doctor_id
    );

-- Policy to allow doctors to delete their own patients' orthodontic history
CREATE POLICY "Doctors can delete their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR DELETE
    USING (
        auth.uid() = doctor_id
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_historia_clinica_ortodoncia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_historia_clinica_ortodoncia_updated_at
    BEFORE UPDATE ON historia_clinica_ortodoncia
    FOR EACH ROW
    EXECUTE FUNCTION update_historia_clinica_ortodoncia_updated_at();

-- Grant permissions
GRANT ALL ON historia_clinica_ortodoncia TO authenticated;
GRANT SELECT ON historia_clinica_ortodoncia TO anon;

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'historia_clinica_ortodoncia'
ORDER BY ordinal_position;
