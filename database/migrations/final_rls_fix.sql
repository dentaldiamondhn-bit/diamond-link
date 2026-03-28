-- Final RLS fix - completely reset and recreate policies for anon role
-- This will fix the issue where anon key (web app) cannot access data

-- COMPLETELY RESET dental_studies RLS
ALTER TABLE dental_studies DISABLE ROW LEVEL SECURITY;
ALTER TABLE dental_studies ENABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies for dental_studies
DROP POLICY IF EXISTS "Users can view dental studies" ON dental_studies;
DROP POLICY IF EXISTS "Users can insert dental studies" ON dental_studies;
DROP POLICY IF EXISTS "Users can update dental studies" ON dental_studies;
DROP POLICY IF EXISTS "Users can delete dental studies" ON dental_studies;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_studies;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON dental_studies;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON dental_studies;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON dental_studies;

-- Create policies that work for both anon and authenticated users
-- Allow ANYONE to read dental studies (for now, to test)
CREATE POLICY "Allow public read access" ON dental_studies
    FOR SELECT USING (true);

-- Allow authenticated users to modify data
CREATE POLICY "Allow authenticated insert" ON dental_studies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON dental_studies
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON dental_studies
    FOR DELETE USING (auth.role() = 'authenticated');

-- Do the same for related tables
ALTER TABLE dental_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE dental_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view dental images" ON dental_images;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_images;
CREATE POLICY "Allow public read access to images" ON dental_images
    FOR SELECT USING (true);

ALTER TABLE dental_annotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE dental_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view dental annotations" ON dental_annotations;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_annotations;
CREATE POLICY "Allow public read access to annotations" ON dental_annotations
    FOR SELECT USING (true);

ALTER TABLE dental_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE dental_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view dental reports" ON dental_reports;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON dental_reports;
CREATE POLICY "Allow public read access to reports" ON dental_reports
    FOR SELECT USING (true);
