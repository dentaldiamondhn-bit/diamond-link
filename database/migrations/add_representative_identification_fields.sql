-- Add representative identification fields to patients table
-- Run this script in Supabase SQL Editor

-- Add new columns to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS rep_tipo_identificacion TEXT,
ADD COLUMN IF NOT EXISTS rep_otro_tipo_identificacion TEXT,
ADD COLUMN IF NOT EXISTS rep_numero_identidad TEXT;

-- Add new columns for minor-specific fields
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS apodo TEXT,
ADD COLUMN IF NOT EXISTS enfermedades_sistemicas_texto TEXT,
ADD COLUMN IF NOT EXISTS pediatra_otorrinolaringologo TEXT,
ADD COLUMN IF NOT EXISTS pediatra TEXT,
ADD COLUMN IF NOT EXISTS psicologo TEXT,
ADD COLUMN IF NOT EXISTS otro_medico TEXT,
ADD COLUMN IF NOT EXISTS frecuencia_cepillado_detalle TEXT,
ADD COLUMN IF NOT EXISTS cepillado_acompanado TEXT,
ADD COLUMN IF NOT EXISTS peso DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS talla DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS tipo_alimentacion TEXT,
ADD COLUMN IF NOT EXISTS momentos_azucar TEXT;

-- Add comments for documentation
COMMENT ON COLUMN patients.rep_tipo_identificacion IS 'Tipo de identificación del representante legal (HN, US, GT, SV, NI, ES, OTRO)';
COMMENT ON COLUMN patients.rep_otro_tipo_identificacion IS 'Especificación del tipo de identificación del representante legal cuando es OTRO';
COMMENT ON COLUMN patients.rep_numero_identidad IS 'Número de identificación del representante legal';
COMMENT ON COLUMN patients.apodo IS 'Apodo o nickname del paciente (principalmente para menores)';
COMMENT ON COLUMN patients.enfermedades_sistemicas_texto IS 'Texto adicional sobre enfermedades sistémicas del paciente';
COMMENT ON COLUMN patients.pediatra_otorrinolaringologo IS 'Nombre del pediatra otorrinolaringólogo del paciente';
COMMENT ON COLUMN patients.pediatra IS 'Nombre del pediatra del paciente';
COMMENT ON COLUMN patients.psicologo IS 'Nombre del psicólogo del paciente';
COMMENT ON COLUMN patients.otro_medico IS 'Nombre de otro tipo de médico del paciente';
COMMENT ON COLUMN patients.frecuencia_cepillado_detalle IS 'Detalle sobre cuándo se cepilla los dientes';
COMMENT ON COLUMN patients.cepillado_acompanado IS 'Indica si el cepillado es acompañado o supervisado';
COMMENT ON COLUMN patients.peso IS 'Peso del paciente en kg (principalmente para menores)';
COMMENT ON COLUMN patients.talla IS 'Talla del paciente en cm (principalmente para menores)';
COMMENT ON COLUMN patients.tipo_alimentacion IS 'Tipo de alimentación del paciente (principalmente para menores)';
COMMENT ON COLUMN patients.momentos_azucar IS 'Momentos en que consume azúcar (principalmente para menores)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_patients_rep_tipo_identificacion ON patients(rep_tipo_identificacion);
CREATE INDEX IF NOT EXISTS idx_patients_rep_numero_identidad ON patients(rep_numero_identidad);
CREATE INDEX IF NOT EXISTS idx_patients_apodo ON patients(apodo);
CREATE INDEX IF NOT EXISTS idx_patients_pediatra_otorrinolaringologo ON patients(pediatra_otorrinolaringologo);
CREATE INDEX IF NOT EXISTS idx_patients_pediatra ON patients(pediatra);
CREATE INDEX IF NOT EXISTS idx_patients_psicologo ON patients(psicologo);
CREATE INDEX IF NOT EXISTS idx_patients_otro_medico ON patients(otro_medico);
CREATE INDEX IF NOT EXISTS idx_patients_frecuencia_cepillado_detalle ON patients(frecuencia_cepillado_detalle);
CREATE INDEX IF NOT EXISTS idx_patients_cepillado_acompanado ON patients(cepillado_acompanado);
CREATE INDEX IF NOT EXISTS idx_patients_peso ON patients(peso);
CREATE INDEX IF NOT EXISTS idx_patients_talla ON patients(talla);
CREATE INDEX IF NOT EXISTS idx_patients_tipo_alimentacion ON patients(tipo_alimentacion);
CREATE INDEX IF NOT EXISTS idx_patients_momentos_azucar ON patients(momentos_azucar);

-- Add check constraint for rep_tipo_identificacion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'chk_rep_tipo_identificacion'
    ) THEN
        ALTER TABLE patients 
        ADD CONSTRAINT chk_rep_tipo_identificacion 
        CHECK (rep_tipo_identificacion IN ('HN', 'US', 'GT', 'SV', 'NI', 'ES', 'OTRO', NULL));
    END IF;
END $$;

-- RLS Policy update (if you have RLS enabled)
-- Note: Update your existing RLS policies to include the new fields if needed

-- Example: Update existing policy to include new fields
/*
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
CREATE POLICY "patients_insert_policy" ON patients
FOR INSERT
WITH CHECK (
  -- Include all existing checks plus new fields
  -- Your existing conditions here
  true -- Replace with your actual conditions
);

DROP POLICY IF EXISTS "patients_update_policy" ON patients;
CREATE POLICY "patients_update_policy" ON patients
FOR UPDATE
USING (
  -- Include all existing checks plus new fields  
  -- Your existing conditions here
  true -- Replace with your actual conditions
);
*/
