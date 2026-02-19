-- Add observaciones_generales field to patients table
-- This migration adds the new Observaciones Generales field

-- Add observaciones_generales field
ALTER TABLE patients 
ADD COLUMN observaciones_generales TEXT;

-- Add comment to document the new field
COMMENT ON COLUMN patients.observaciones_generales IS 'Observaciones generales del paciente - notas adicionales sobre el caso';

-- Verify column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name='patients' 
AND column_name='observaciones_generales';
