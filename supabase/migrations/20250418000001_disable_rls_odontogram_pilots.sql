-- Disable RLS on odontogram_pilots to match original odontograms behavior
ALTER TABLE odontogram_pilots DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies (idempotent)
DROP POLICY IF EXISTS "Allow authenticated read access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated update access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON odontogram_pilots;
