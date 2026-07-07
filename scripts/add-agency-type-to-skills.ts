import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addMetadataField() {
  console.log('🔧 Adding metadata field to skills table...');
  
  try {
    // Try to add column directly via SQL using raw query
    const { error: addColumnError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE skills ADD COLUMN IF NOT EXISTS metadata JSONB;' 
      });
    
    if (addColumnError) {
      console.log('⚠️ RPC failed, column may already exist or RPC not available');
      // Try to verify by querying
      const { error: verifyError } = await supabase
        .from('skills')
        .select('metadata')
        .limit(1);
      
      if (verifyError && verifyError.code === '42703') {
        console.error('❌ metadata column does not exist');
        console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
        console.log('ALTER TABLE skills ADD COLUMN IF NOT EXISTS metadata JSONB;');
        return;
      }
    }
    
    console.log('✅ metadata field added successfully');
    
  } catch (error) {
    console.error('❌ Error adding metadata field:', error);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('ALTER TABLE skills ADD COLUMN IF NOT EXISTS metadata JSONB;');
  }
}

async function addAgencyTypeField() {
  console.log('🔧 Adding agency_type field to skills table...');
  
  try {
    // Try to add column directly via SQL
    const { error: addColumnError } = await supabase
      .rpc('exec_sql', { 
        sql: 'ALTER TABLE skills ADD COLUMN IF NOT EXISTS agency_type TEXT;' 
      });
    
    if (addColumnError) {
      console.log('⚠️ RPC failed, column may already exist or RPC not available');
      // Try to verify by querying
      const { error: verifyError } = await supabase
        .from('skills')
        .select('agency_type')
        .limit(1);
      
      if (verifyError && verifyError.code === '42703') {
        console.error('❌ agency_type column does not exist');
        console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
        console.log('ALTER TABLE skills ADD COLUMN IF NOT EXISTS agency_type TEXT;');
        console.log('CREATE INDEX IF NOT EXISTS idx_skills_agency_type ON skills(agency_type);');
        return;
      }
    }
    
    // Create index
    console.log('Creating index on agency_type...');
    const { error: indexError } = await supabase
      .rpc('exec_sql', { 
        sql: 'CREATE INDEX IF NOT EXISTS idx_skills_agency_type ON skills(agency_type);' 
      });
    
    if (indexError) {
      console.warn('⚠️ Could not create index (may already exist):', indexError.message);
    }
    
    console.log('✅ agency_type field added successfully');
    
  } catch (error) {
    console.error('❌ Error adding agency_type field:', error);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('ALTER TABLE skills ADD COLUMN IF NOT EXISTS agency_type TEXT;');
    console.log('CREATE INDEX IF NOT EXISTS idx_skills_agency_type ON skills(agency_type);');
  }
}

// Run the migrations
async function runMigrations() {
  await addMetadataField();
  await addAgencyTypeField();
}

runMigrations()
  .then(() => {
    console.log('✨ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
