-- Migration to update radiografias_realizadas field to support multiple selections
-- This migration changes the field from TEXT to TEXT[] to support array of radiography types

-- First, create a backup of existing data
CREATE TABLE IF NOT EXISTS historia_clinica_ortodoncia_radiografias_backup AS
SELECT * FROM historia_clinica_ortodoncia;

-- Step 1: Drop the existing CHECK constraint to allow data updates
ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT IF EXISTS historia_clinica_ortodoncia_radiografias_realizadas_check;

-- Step 2: Fix specific problematic data
UPDATE historia_clinica_ortodoncia 
SET radiografias_realizadas = ARRAY['lateral_craneo']
WHERE radiografias_realizadas = '{lateral_craneo}';

-- Step 3: Update existing single values to array format
-- This converts existing single values to arrays for backward compatibility
UPDATE historia_clinica_ortodoncia 
SET radiografias_realizadas = CASE 
    WHEN radiografias_realizadas IS NULL OR radiografias_realizadas = '' THEN '{}'
    WHEN radiografias_realizadas = 'todas' THEN ARRAY['panoramica', 'periapical', 'oclusal', 'lateral_craneo']
    WHEN radiografias_realizadas LIKE '{%' THEN 
        -- Handle various malformed array formats
        CASE 
            -- Handle {lateral_craneo} format
            WHEN radiografias_realizadas = '{lateral_craneo}' THEN ARRAY['lateral_craneo']
            -- Handle {lateral_craneo,} format (with trailing comma)
            WHEN radiografias_realizadas = '{lateral_craneo,}' THEN ARRAY['lateral_craneo']
            -- Handle other potential malformed formats
            WHEN radiografias_realizadas LIKE '{lateral_craneo%' THEN 
                -- Extract the value and convert to proper array
                CASE 
                    WHEN position('}' IN radiografias_realizadas) > 0 THEN 
                        ARRAY[substring(radiografias_realizadas, 2, position('}' IN radiografias_realizadas) - 2)]
                    ELSE ARRAY['lateral_craneo']
                END
            ELSE 
                -- Try to cast as array, if fails use empty array
                CASE 
                    WHEN radiografias_realizadas::TEXT[] IS NOT NULL THEN radiografias_realizadas::TEXT[]
                    ELSE '{}'
                END
        END
    ELSE ARRAY[radiografias_realizadas]
END
WHERE radiografias_realizadas IS NOT NULL;

-- Step 4: Change column type from TEXT to TEXT[] (array)
ALTER TABLE historia_clinica_ortodoncia 
ALTER COLUMN radiografias_realizadas TYPE TEXT[] USING radiografias_realizadas::TEXT[];

-- Step 5: Add a new CHECK constraint for array values
ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_radiografias_realizadas_check 
CHECK (
    radiografias_realizadas <@ ARRAY[
        'panoramica', 
        'periapical', 
        'oclusal', 
        'lateral_craneo'
    ]
);

-- Step 6: Create a GIN index for better array performance
CREATE INDEX IF NOT EXISTS idx_historia_clinica_ortodoncia_radiografias_gin 
ON historia_clinica_ortodoncia USING GIN (radiografias_realizadas);

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'historia_clinica_ortodoncia' 
AND column_name = 'radiografias_realizadas';

-- Show sample of updated data
SELECT 
    id,
    paciente_id,
    radiografias_realizadas,
    updated_at
FROM historia_clinica_ortodoncia 
WHERE radiografias_realizadas IS NOT NULL
AND cardinality(radiografias_realizadas) > 0
ORDER BY updated_at DESC
LIMIT 5;

-- Drop backup table after successful migration (uncomment when ready)
-- DROP TABLE IF EXISTS historia_clinica_ortodoncia_radiografias_backup;
