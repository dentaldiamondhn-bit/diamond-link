-- Fix RLS policies for dental_studies table
-- Allow authenticated users to read dental studies

-- First, enable RLS if not already enabled
ALTER TABLE dental_studies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view dental studies" ON dental_studies;
DROP POLICY IF EXISTS "Users can insert dental studies" ON dental_studies;
DROP POLICY IF EXISTS "Users can update dental studies" ON dental_studies;
DROP POLICY IF EXISTS "Users can delete dental studies" ON dental_studies;

-- Create policy to allow authenticated users to read dental studies
CREATE POLICY "Users can view dental studies" ON dental_studies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert dental studies
CREATE POLICY "Users can insert dental studies" ON dental_studies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update dental studies
CREATE POLICY "Users can update dental studies" ON dental_studies
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete dental studies
CREATE POLICY "Users can delete dental studies" ON dental_studies
    FOR DELETE USING (auth.role() = 'authenticated');

-- Also fix RLS for related tables if needed
ALTER TABLE dental_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for related tables
DROP POLICY IF EXISTS "Users can view dental images" ON dental_images;
DROP POLICY IF EXISTS "Users can insert dental images" ON dental_images;
DROP POLICY IF EXISTS "Users can update dental images" ON dental_images;
DROP POLICY IF EXISTS "Users can delete dental images" ON dental_images;

DROP POLICY IF EXISTS "Users can view dental annotations" ON dental_annotations;
DROP POLICY IF EXISTS "Users can insert dental annotations" ON dental_annotations;
DROP POLICY IF EXISTS "Users can update dental annotations" ON dental_annotations;
DROP POLICY IF EXISTS "Users can delete dental annotations" ON dental_annotations;

DROP POLICY IF EXISTS "Users can view dental reports" ON dental_reports;
DROP POLICY IF EXISTS "Users can insert dental reports" ON dental_reports;
DROP POLICY IF EXISTS "Users can update dental reports" ON dental_reports;
DROP POLICY IF EXISTS "Users can delete dental reports" ON dental_reports;

-- Create policies for dental_images
CREATE POLICY "Users can view dental images" ON dental_images
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert dental images" ON dental_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update dental images" ON dental_images
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete dental images" ON dental_images
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for dental_annotations
CREATE POLICY "Users can view dental annotations" ON dental_annotations
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert dental annotations" ON dental_annotations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update dental annotations" ON dental_annotations
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete dental annotations" ON dental_annotations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for dental_reports
CREATE POLICY "Users can view dental reports" ON dental_reports
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert dental reports" ON dental_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update dental reports" ON dental_reports
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete dental reports" ON dental_reports
    FOR DELETE USING (auth.role() = 'authenticated');
