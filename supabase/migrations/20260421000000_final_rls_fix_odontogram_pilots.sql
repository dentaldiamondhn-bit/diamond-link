-- Final RLS fix for odontogram_pilots table
-- This migration MUST run AFTER the table creation migration
-- It disables RLS and drops all policies to match the original odontograms table behavior

-- Disable Row Level Security
ALTER TABLE odontogram_pilots DISABLE ROW LEVEL SECURITY;

-- Drop all policies (if any exist)
DROP POLICY IF EXISTS "Allow authenticated read access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated update access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON odontogram_pilots;

-- Ensure trigger exists (create if missing)
CREATE OR REPLACE FUNCTION update_odontogram_pilot_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_odontogram_pilots_updated_at ON odontogram_pilots;
CREATE TRIGGER update_odontogram_pilots_updated_at
  BEFORE UPDATE ON odontogram_pilots
  FOR EACH ROW
  EXECUTE FUNCTION update_odontogram_pilot_updated_at();

-- Grant broad permissions (optional but helpful)
GRANT ALL ON odontogram_pilots TO authenticated;
GRANT ALL ON odontogram_pilots TO service_role;
