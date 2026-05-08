-- Add ausente status support to O'Leary table
-- This migration adds support for tracking missing teeth in O'Leary odontograms

-- Add a new column to track ausente (missing) teeth at the tooth level
-- This will be stored in the JSONB datos_odontograma field, but we need to ensure the structure supports it

-- Update existing O'Leary data to include ausente status in the JSONB structure
-- This is handled in the application layer, but we ensure the table structure supports it

-- Add a constraint to ensure valid status values (optional, can be handled in app)
-- ALTER TABLE o_leary ADD CONSTRAINT check_o_leary_status 
--   CHECK (datos_odontograma::text LIKE '%"sano"%' OR 
--          datos_odontograma::text LIKE '%"placa"%' OR 
--          datos_odontograma::text LIKE '%"ausente"%');

-- No structural changes needed since ausente status is stored in the existing JSONB field
-- The application will handle the new status in the datos_odontograma JSON structure

-- Grant permissions (if needed)
-- GRANT ALL ON o_leary TO authenticated;
-- GRANT ALL ON o_leary TO service_role;
