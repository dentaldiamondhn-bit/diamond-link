-- Migration to update retainer options in historia_clinica_ortodoncia table
-- This migration adds new retainer types and updates existing 'hawley' to 'hawley_convencional'

-- First, update existing 'hawley' values to 'hawley_convencional'
UPDATE historia_clinica_ortodoncia 
SET retenedor_tipo = 'hawley_convencional' 
WHERE retenedor_tipo = 'hawley';

UPDATE historia_clinica_ortodoncia 
SET retenedor_inferior_tipo = 'hawley_convencional' 
WHERE retenedor_inferior_tipo = 'hawley';

-- Drop the existing CHECK constraint
ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT IF EXISTS historia_clinica_ortodoncia_retenedor_tipo_check;

-- Add new CHECK constraint with updated values
ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_retenedor_tipo_check 
CHECK (retenedor_tipo IN ('fijo', 'removible', 'hawley_convencional', 'hawley_arco_continuo', 'hawley_arco_continuo_banda_anterior', 'invisible', 'sin_retenedor'));

-- Drop the existing CHECK constraint for inferior retainer
ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT IF EXISTS historia_clinica_ortodoncia_retenedor_inferior_tipo_check;

-- Add new CHECK constraint for inferior retainer with updated values
ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_retenedor_inferior_tipo_check 
CHECK (retenedor_inferior_tipo IN ('fijo', 'removible', 'hawley_convencional', 'hawley_arco_continuo', 'hawley_arco_continuo_banda_anterior', 'invisible', 'sin_retenedor'));

-- Add comments for documentation
COMMENT ON COLUMN historia_clinica_ortodoncia.retenedor_tipo IS 'Tipo de retenedor superior - valores: fijo, removible, hawley_convencional, hawley_arco_continuo, hawley_arco_continuo_banda_anterior, invisible, sin_retenedor';

COMMENT ON COLUMN historia_clinica_ortodoncia.retenedor_inferior_tipo IS 'Tipo de retenedor inferior - valores: fijo, removible, hawley_convencional, hawley_arco_continuo, hawley_arco_continuo_banda_anterior, invisible, sin_retenedor';
