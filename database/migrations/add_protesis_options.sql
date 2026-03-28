-- SQL Script to add new prosthetic options to the patients table
-- This script updates the CHECK constraint for protesis_tipo column to include new options

-- First, let's check the current constraint and table structure
-- We'll need to drop the existing constraint and create a new one

-- Drop the existing check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'patients_protesis_tipo_check' 
        AND table_name = 'patients'
    ) THEN
        ALTER TABLE patients DROP CONSTRAINT patients_protesis_tipo_check;
    END IF;
END $$;

-- Add the updated check constraint with new prosthetic options
ALTER TABLE patients 
ADD CONSTRAINT patients_protesis_tipo_check 
CHECK (
    protesis_tipo IN (
        'Removible', 
        'Parcial Removible', 
        'Total', 
        'Fija', 
        'Implante'
    )
);

-- Verify the constraint was added successfully
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'patients' 
    AND tc.constraint_name = 'patients_protesis_tipo_check';

-- Optional: Update any existing records that might have invalid values
-- This is a safety measure in case there are records with values not in the new constraint
UPDATE patients 
SET protesis_tipo = 'Removible' 
WHERE protesis_tipo IS NOT NULL 
    AND protesis_tipo NOT IN ('Removible', 'Parcial Removible', 'Total', 'Fija', 'Implante');

-- Show summary of prostesis_tipo values in the database
SELECT 
    protesis_tipo,
    COUNT(*) as count
FROM patients 
WHERE protesis_tipo IS NOT NULL
GROUP BY protesis_tipo
ORDER BY count DESC;

-- Script completed successfully
-- The protesis_tipo column now supports:
-- - Removible (existing)
-- - Parcial Removible (new)
-- - Total (new)
-- - Fija (existing)
-- - Implante (existing)
