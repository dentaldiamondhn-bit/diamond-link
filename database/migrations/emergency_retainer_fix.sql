-- Emergency fix: Remove constraint temporarily to allow data updates
-- This will allow the form to work while we fix the database

-- Step 1: Drop the constraint temporarily (no IF EXISTS check for simplicity)
ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT IF EXISTS historia_clinica_ortodoncia_retenedor_tipo_check;

ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT IF EXISTS historia_clinica_ortodoncia_retenedor_inferior_tipo_check;

-- Step 2: Update existing data (if any)
UPDATE historia_clinica_ortodoncia 
SET retenedor_tipo = 'hawley_convencional' 
WHERE retenedor_tipo = 'hawley';

UPDATE historia_clinica_ortodoncia 
SET retenedor_inferior_tipo = 'hawley_convencional' 
WHERE retenedor_inferior_tipo = 'hawley';

-- Step 3: Add the new constraint with all updated values
ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_retenedor_tipo_check 
CHECK (retenedor_tipo IN ('fijo', 'removible', 'hawley_convencional', 'hawley_arco_continuo', 'hawley_arco_continuo_banda_anterior', 'invisible', 'sin_retenedor', NULL));

ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_retenedor_inferior_tipo_check 
CHECK (retenedor_inferior_tipo IN ('fijo', 'removible', 'hawley_convencional', 'hawley_arco_continuo', 'hawley_arco_continuo_banda_anterior', 'invisible', 'sin_retenedor', NULL));

-- Also add NULL to the constraint to handle empty values
-- This should resolve the immediate constraint violation issue
