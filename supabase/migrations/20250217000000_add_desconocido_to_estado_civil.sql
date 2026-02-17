-- Add 'Desconocido' option to estado_civil column
-- This migration ensures the database accepts the new 'Desconocido' value for minors

-- First, check if there's a check constraint on estado_civil and drop it if exists
DO $$
BEGIN
    -- Try to drop the constraint if it exists (this will fail silently if it doesn't exist)
    ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_estado_civil_check;
EXCEPTION
    WHEN others THEN
        -- Constraint doesn't exist or other error, continue
        NULL;
END $$;

-- Add a new check constraint that includes 'Desconocido'
ALTER TABLE patients 
ADD CONSTRAINT patients_estado_civil_check 
CHECK (estado_civil IN ('Soltero', 'Casado', 'Viudo', 'Divorciado', 'Union Libre', 'Desconocido'));

-- Add comment to document the change
COMMENT ON COLUMN patients.estado_civil IS 'Estado civil del paciente. Incluye opción "Desconocido" para menores que aún no tienen estado civil definido.';
