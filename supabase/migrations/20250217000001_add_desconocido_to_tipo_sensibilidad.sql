-- Add 'desconocido' option to tipo_sensibilidad field
-- This migration adds the new 'desconocido' option to the tipo_sensibilidad field in the patients table

-- Note: Since tipo_sensibilidad is a text field (not an enum), we don't need to alter the table structure
-- The new option will be available in the application dropdown and can be stored directly

-- Update any existing NULL values to 'desconocido' if needed (optional)
-- UPDATE patients 
-- SET tipo_sensibilidad = 'desconocido' 
-- WHERE tipo_sensibilidad IS NULL OR tipo_sensibilidad = '';

-- Add comment to document the new option
COMMENT ON COLUMN patients.tipo_sensibilidad IS 'Tipo de sensibilidad dental: dulce, frio, caliente, acido, presion, multiple, desconocido';
