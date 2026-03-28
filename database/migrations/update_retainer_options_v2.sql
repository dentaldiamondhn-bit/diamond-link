-- Simple migration to update retainer options without constraint issues
-- This script updates existing data and then safely modifies constraints

-- First, update existing 'hawley' values to 'hawley_convencional'
UPDATE historia_clinica_ortodoncia 
SET retenedor_tipo = 'hawley_convencional' 
WHERE retenedor_tipo = 'hawley';

UPDATE historia_clinica_ortodoncia 
SET retenedor_inferior_tipo = 'hawley_convencional' 
WHERE retenedor_inferior_tipo = 'hawley';

-- Check if constraints exist and update them
-- For PostgreSQL, we need to drop and recreate the constraints

-- Drop existing constraints (if they exist)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'historia_clinica_ortodoncia_retenedor_tipo_check' 
        AND table_name = 'historia_clinica_ortodoncia'
    ) THEN
        ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT historia_clinica_ortodoncia_retenedor_tipo_check;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'historia_clinica_ortodoncia_retenedor_inferior_tipo_check' 
        AND table_name = 'historia_clinica_ortodoncia'
    ) THEN
        ALTER TABLE historia_clinica_ortodoncia DROP CONSTRAINT historia_clinica_ortodoncia_retenedor_inferior_tipo_check;
    END IF;
END $$;

-- Add new CHECK constraint with updated values for superior retainer
ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_retenedor_tipo_check 
CHECK (retenedor_tipo IN ('fijo', 'removible', 'hawley_convencional', 'hawley_arco_continuo', 'hawley_arco_continuo_banda_anterior', 'invisible', 'sin_retenedor'));

-- Add new CHECK constraint with updated values for inferior retainer
ALTER TABLE historia_clinica_ortodoncia 
ADD CONSTRAINT historia_clinica_ortodoncia_retenedor_inferior_tipo_check 
CHECK (retenedor_inferior_tipo IN ('fijo', 'removible', 'hawley_convencional', 'hawley_arco_continuo', 'hawley_arco_continuo_banda_anterior', 'invisible', 'sin_retenedor'));

-- Verify the changes
SELECT 'Updated ' || COUNT(*) || ' records for superior retainer' as result 
FROM historia_clinica_ortodoncia 
WHERE retenedor_tipo = 'hawley_convencional';

SELECT 'Updated ' || COUNT(*) || ' records for inferior retainer' as result 
FROM historia_clinica_ortodoncia 
WHERE retenedor_inferior_tipo = 'hawley_convencional';
