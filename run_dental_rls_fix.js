import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runRLSFix() {
  console.log('🔧 Running RLS fix for dental_studies table...');
  
  const sql = `
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
  `;

  try {
    console.log('🚀 Executing RLS fix SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      console.error('❌ Error executing SQL:', error);
      
      // Try alternative approach using direct SQL
      console.log('🔄 Trying alternative approach...');
      const { data: altData, error: altError } = await supabase
        .from('dental_studies')
        .select('count')
        .limit(1);
      
      if (altError) {
        console.error('❌ Alternative approach also failed:', altError);
        console.log('\n📋 Manual execution required:');
        console.log('1. Go to Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy the SQL from: /home/dentaldiamondhn/clerk/database/migrations/fix_dental_studies_rls.sql');
        console.log('4. Paste and run the SQL');
      } else {
        console.log('✅ Table access confirmed, but RLS policies need manual setup');
      }
    } else {
      console.log('✅ RLS fix executed successfully!');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

runRLSFix();
