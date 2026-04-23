-- Update existing RLS policies for odontogram_pilots table
-- This migration fixes conflicts by dropping existing policies first

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated update access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON odontogram_pilots;

-- Recreate policies with proper names
CREATE POLICY "Allow authenticated read access" ON odontogram_pilots
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access" ON odontogram_pilots
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update access" ON odontogram_pilots
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete access" ON odontogram_pilots
FOR DELETE USING (auth.role() = 'authenticated');
