-- Migration to add inferior retainer fields to historia_clinica_ortodoncia table
-- This migration adds retenedor_inferior_tipo and retenedor_inferior_uso fields

-- Add inferior retainer fields to the table
ALTER TABLE historia_clinica_ortodoncia 
ADD COLUMN retenedor_inferior_tipo TEXT CHECK (retenedor_inferior_tipo IN ('fijo', 'removible', 'hawley', 'invisible', 'sin_retenedor'));

ALTER TABLE historia_clinica_ortodoncia 
ADD COLUMN retenedor_inferior_uso TEXT CHECK (retenedor_inferior_uso IN ('tiempo_completo', 'noche', 'ocasional', 'no_usa'));

-- Update the comment for the retainer section
COMMENT ON COLUMN historia_clinica_ortodoncia.retenedor_tipo IS 'Tipo de retenedor superior (arco superior)';

-- Add comments for new inferior retainer fields
COMMENT ON COLUMN historia_clinica_ortodoncia.retenedor_inferior_tipo IS 'Tipo de retenedor inferior (arco inferior)';

COMMENT ON COLUMN historia_clinica_ortodoncia.retenedor_inferior_uso IS 'Uso de retenedor inferior (arco inferior)';

-- Verify the new columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'historia_clinica_ortodoncia' 
AND column_name IN ('retenedor_inferior_tipo', 'retenedor_inferior_uso')
ORDER BY ordinal_position;
