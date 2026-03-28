-- Migration to add tipo_enjuague_bucal field to patients table
-- This field stores the type of mouthwash when enjuague_bucal is "si"

-- First, let's check if the column already exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'tipo_enjuague_bucal';

-- Add the new column if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS tipo_enjuague_bucal TEXT;

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default 
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'tipo_enjuague_bucal';

-- Show current data for enjuague_bucal and tipo_enjuague_bucal
SELECT 
    paciente_id,
    enjuague_bucal,
    tipo_enjuague_bucal,
    CASE 
        WHEN enjuague_bucal = 'si' AND (tipo_enjuague_bucal IS NULL OR tipo_enjuague_bucal = '') THEN 'Missing tipo_enjuague_bucal'
        WHEN enjuague_bucal = 'si' AND tipo_enjuague_bucal IS NOT NULL AND tipo_enjuague_bucal != '' THEN 'Has tipo_enjuague_bucal'
        WHEN enjuague_bucal = 'no' THEN 'No enjuague_bucal'
        WHEN enjuague_bucal IS NULL OR enjuague_bucal = '' THEN 'No enjuague_bucal'
        ELSE 'Other'
    END as status
FROM patients 
WHERE enjuague_bucal IS NOT NULL 
ORDER BY paciente_id
LIMIT 10;

-- Count patients who use mouthwash
SELECT 
    enjuague_bucal,
    COUNT(*) as patient_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients WHERE enjuague_bucal IS NOT NULL), 2) as percentage
FROM patients 
WHERE enjuague_bucal IS NOT NULL 
GROUP BY enjuague_bucal;

-- Count patients who have tipo_enjuague_bucal data
SELECT 
    CASE 
        WHEN tipo_enjuague_bucal IS NOT NULL AND tipo_enjuague_bucal != '' THEN 'Has tipo_enjuague_bucal'
        ELSE 'No tipo_enjuague_bucal'
    END as has_tipo_enjuague_bucal,
    COUNT(*) as patient_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients WHERE enjuague_bucal = 'si'), 2) as percentage_of_si_users
FROM patients 
WHERE enjuague_bucal = 'si'
GROUP BY has_tipo_enjuague_bucal;
