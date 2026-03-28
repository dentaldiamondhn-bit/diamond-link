-- Add cafe_frecuencia field to patients table
-- This migration adds the new Frecuencia field for coffee consumption

-- Add cafe_frecuencia field
ALTER TABLE patients 
ADD COLUMN cafe_frecuencia VARCHAR(20);

-- Add comment to document the new field
COMMENT ON COLUMN patients.cafe_frecuencia IS 'Frecuencia de consumo de cafe - Social, Diario, Semanal, Mensual, Ocasional';

-- Add check constraint for valid values
ALTER TABLE patients 
ADD CONSTRAINT chk_cafe_frecuencia 
CHECK (cafe_frecuencia IN ('Social', 'Diario', 'Semanal', 'Mensual', 'Ocasional', NULL, ''));

-- Verify column was added
SELECT column_name, data_type, is_nullable, character_maximum_length 
FROM information_schema.columns 
WHERE table_name='patients' 
AND column_name='cafe_frecuencia';
