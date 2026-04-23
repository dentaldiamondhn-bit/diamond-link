-- Comprehensive fix for odontogram_pilots RLS issues
-- Run this in Supabase SQL Editor to ensure the table is accessible

-- First, check current RLS status and policies
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'odontogram_pilots';

-- Drop all existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated update access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON odontogram_pilots;

-- Disable Row Level Security completely (matching original odontograms table behavior)
ALTER TABLE odontogram_pilots DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'odontogram_pilots';

-- Optional: Grant broad permissions to authenticated users
GRANT ALL ON odontogram_pilots TO authenticated;
GRANT ALL ON odontogram_pilots TO service_role;

-- Test insert capability (uncomment to test)
-- INSERT INTO odontogram_pilots (paciente_id, version, datos_odontograma, notas, activo) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 1, '{}', 'test', true) ON CONFLICT DO NOTHING;
