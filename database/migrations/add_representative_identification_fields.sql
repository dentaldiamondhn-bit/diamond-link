-- Add representative identification fields to patients table
-- Run this script in Supabase SQL Editor

-- Add new columns to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS rep_tipo_identificacion TEXT,
ADD COLUMN IF NOT EXISTS rep_otro_tipo_identificacion TEXT,
ADD COLUMN IF NOT EXISTS rep_numero_identidad TEXT;

-- Add comments for documentation
COMMENT ON COLUMN patients.rep_tipo_identificacion IS 'Tipo de identificación del representante legal (HN, US, GT, SV, NI, ES, OTRO)';
COMMENT ON COLUMN patients.rep_otro_tipo_identificacion IS 'Especificación del tipo de identificación del representante legal cuando es OTRO';
COMMENT ON COLUMN patients.rep_numero_identidad IS 'Número de identificación del representante legal';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_patients_rep_tipo_identificacion ON patients(rep_tipo_identificacion);
CREATE INDEX IF NOT EXISTS idx_patients_rep_numero_identidad ON patients(rep_numero_identidad);

-- Add check constraint for rep_tipo_identificacion
-- First check if constraint exists, then add it
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
