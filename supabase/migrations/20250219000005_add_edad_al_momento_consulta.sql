-- Migration to add edad_al_momento_consulta field to patients table
-- This field stores the patient's age at the time of clinical history creation (fecha_inicio)

-- First, let's check if the column already exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'edad_al_momento_consulta';

-- Add the new column if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS edad_al_momento_consulta INTEGER;

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default 
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'edad_al_momento_consulta';

-- Populate the new column with age calculated at fecha_inicio
-- This uses the same logic as the current edad field but with fecha_inicio instead of today's date
UPDATE patients 
SET edad_al_momento_consulta = CASE
    -- If fecha_inicio exists, calculate age at that time
    WHEN fecha_inicio IS NOT NULL AND fecha_nacimiento IS NOT NULL
    THEN 
        EXTRACT(YEAR FROM AGE(
            CASE 
                -- Try to parse fecha_inicio as date
                WHEN fecha_inicio::text ~ '^\d{4}-\d{2}-\d{2}$' THEN fecha_inicio::date
                WHEN fecha_inicio::text ~ '^\d{2}/\d{2}/\d{4}$' THEN fecha_inicio::date
                WHEN fecha_inicio::text ~ '^\d{2}-\d{2}-\d{4}$' THEN fecha_inicio::date
                -- If no valid format, use today's date as fallback
                ELSE CURRENT_DATE
            END,
            CASE 
                -- Try to parse fecha_nacimiento as date
                WHEN fecha_nacimiento::text ~ '^\d{4}-\d{2}-\d{2}$' THEN fecha_nacimiento::date
                WHEN fecha_nacimiento::text ~ '^\d{2}/\d{2}/\d{4}$' THEN fecha_nacimiento::date
                WHEN fecha_nacimiento::text ~ '^\d{2}-\d{2}-\d{4}$' THEN fecha_nacimiento::date
                ELSE NULL
            END
        ))
    
    -- If no fecha_inicio, use current edad as fallback
    WHEN edad IS NOT NULL THEN edad
    
    -- Default to 0 if no data available
    ELSE 0
END
WHERE fecha_nacimiento IS NOT NULL;

-- Show sample results to verify the calculation
SELECT 
    paciente_id,
    nombre_completo,
    fecha_nacimiento,
    fecha_inicio,
    edad as edad_actual,
    edad_al_momento_consulta as edad_al_momento_consulta,
    CASE 
        WHEN fecha_inicio IS NOT NULL
        THEN 'Calculated from fecha_inicio'
        ELSE 'Used current edad as fallback'
    END as calculation_method
FROM patients 
WHERE edad_al_momento_consulta IS NOT NULL
ORDER BY paciente_id
LIMIT 10;

-- Summary statistics
SELECT 
    COUNT(*) as total_patients_with_edad_al_momento_consulta,
    COUNT(CASE WHEN edad_al_momento_consulta > 0 THEN 1 END) as patients_with_positive_edad,
    COUNT(CASE WHEN edad_al_momento_consulta = 0 THEN 1 END) as patients_with_zero_edad,
    COUNT(CASE WHEN edad_al_momento_consulta IS NULL THEN 1 END) as patients_with_null_edad,
    ROUND(AVG(edad_al_momento_consulta), 2) as avg_edad_al_momento_consulta
FROM patients;

-- Show comparison between current edad and edad_al_momento_consulta
SELECT 
    COUNT(*) as total_patients,
    COUNT(CASE WHEN edad != edad_al_momento_consulta THEN 1 END) as patients_with_age_difference,
    COUNT(CASE WHEN edad = edad_al_momento_consulta THEN 1 END) as patients_with_same_age,
    ROUND(AVG(edad - edad_al_momento_consulta), 2) as avg_age_difference
FROM patients 
WHERE edad IS NOT NULL AND edad_al_momento_consulta IS NOT NULL;
