-- Migration to update historia_clinica_ortodoncia table for new bite type options
-- This migration updates the tipo_mordida CHECK constraint to include new bite type classifications

-- First, update existing data to map old values to new values
UPDATE historia_clinica_ortodoncia 
SET tipo_mordida = 'clase_ii_division_1' 
WHERE tipo_mordida = 'clase_ii';

UPDATE historia_clinica_ortodoncia 
SET tipo_mordida = 'mordida_abierta_anterior' 
WHERE tipo_mordida = 'mordida_abierta';

UPDATE historia_clinica_ortodoncia 
SET tipo_mordida = 'mordida_cruzada_anterior' 
WHERE tipo_mordida = 'mordida_cruzada';

-- Drop the old CHECK constraint
ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT IF EXISTS historia_clinica_ortodoncia_tipo_mordida_check;

-- Add the new CHECK constraint with updated bite type options
ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_tipo_mordida_check 
CHECK (tipo_mordida IN (
    'clase_i', 
    'clase_ii_division_1', 
    'clase_ii_division_2', 
    'clase_iii', 
    'mordida_abierta_anterior', 
    'mordida_abierta_posterior', 
    'mordida_cruzada_anterior', 
    'mordida_cruzada_posterior', 
    'mordida_profunda'
));

-- Verify the constraint was added correctly
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'historia_clinica_ortodoncia'::regclass 
AND conname = 'historia_clinica_ortodoncia_tipo_mordida_check';

-- Show sample of updated data
SELECT 
    id,
    paciente_id,
    tipo_mordida,
    updated_at
FROM historia_clinica_ortodoncia 
WHERE tipo_mordida IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
