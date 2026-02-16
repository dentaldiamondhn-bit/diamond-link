-- Simple RLS fix for dental_studies table
-- Remove all existing policies and create a simple bypass

-- Disable RLS temporarily to allow access
ALTER TABLE dental_studies DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE dental_studies ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all authenticated users
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_studies;
CREATE POLICY "Enable read access for all authenticated users" ON dental_studies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Also allow insert/update/delete for authenticated users
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON dental_studies;
CREATE POLICY "Enable insert access for all authenticated users" ON dental_studies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON dental_studies;
CREATE POLICY "Enable update access for all authenticated users" ON dental_studies
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON dental_studies;
CREATE POLICY "Enable delete access for all authenticated users" ON dental_studies
    FOR DELETE USING (auth.role() = 'authenticated');

-- Do the same for related tables
ALTER TABLE dental_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE dental_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_images;
CREATE POLICY "Enable read access for all authenticated users" ON dental_images
    FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE dental_annotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE dental_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_annotations;
CREATE POLICY "Enable read access for all authenticated users" ON dental_annotations
    FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE dental_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE dental_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_reports;
CREATE POLICY "Enable read access for all authenticated users" ON dental_reports
    FOR SELECT USING (auth.role() = 'authenticated');
