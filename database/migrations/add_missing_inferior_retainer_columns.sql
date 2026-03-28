-- Add missing inferior retainer columns to historia_clinica_ortodoncia table
-- This script adds the columns that were missing from the original schema

-- Add retenedor_inferior_tipo column
ALTER TABLE historia_clinica_ortodoncia 
ADD COLUMN IF NOT EXISTS retenedor_inferior_tipo TEXT 
CHECK (retenedor_inferior_tipo IN ('fijo', 'removible', 'hawley_convencional', 'hawley_arco_continuo', 'hawley_arco_continuo_banda_anterior', 'invisible', 'sin_retenedor', NULL));

-- Add retenedor_inferior_uso column  
ALTER TABLE historia_clinica_ortodoncia 
ADD COLUMN IF NOT EXISTS retenedor_inferior_uso TEXT 
CHECK (retenedor_inferior_uso IN ('tiempo_completo', 'noche', 'ocasional', 'no_usa', NULL));

-- Add comments for documentation
COMMENT ON COLUMN historia_clinica_ortodoncia.retenedor_inferior_tipo IS 'Tipo de retenedor inferior - valores: fijo, removible, hawley_convencional, hawley_arco_continuo, hawley_arco_continuo_banda_anterior, invisible, sin_retenedor';

COMMENT ON COLUMN historia_clinica_ortodoncia.retenedor_inferior_uso IS 'Uso de retenedor inferior - valores: tiempo_completo, noche, ocasional, no_usa';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'historia_clinica_ortodoncia' 
AND column_name IN ('retenedor_inferior_tipo', 'retenedor_inferior_uso')
ORDER BY column_name;
