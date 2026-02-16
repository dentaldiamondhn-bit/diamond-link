import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSAccess() {
  console.log('🔍 Testing RLS access for dental_studies...');
  
  try {
    // Test 1: Check if table exists and has data
    console.log('\n📊 Test 1: Check table exists and has data');
    const { data: tableData, error: tableError } = await supabase
      .from('dental_studies')
      .select('count')
      .limit(1);
    
    console.log('Table exists test:', { tableData, tableError });
    
    // Test 2: Try to get actual records
    console.log('\n📋 Test 2: Get actual records');
    const { data: records, error: recordsError } = await supabase
      .from('dental_studies')
      .select('id, paciente_id, study_date')
      .limit(5);
    
    console.log('Records test:', { records, recordsError });
    
    // Test 3: Count all records
    console.log('\n🔢 Test 3: Count all records');
    const { count, error: countError } = await supabase
      .from('dental_studies')
      .select('*', { count: 'exact', head: true });
    
    console.log('Count test:', { count, countError });
    
    if (recordsError) {
      console.log('\n❌ RLS is still blocking access');
      console.log('📋 Manual fix required:');
      console.log('1. Go to Supabase Dashboard');
      console.log('2. SQL Editor');
      console.log('3. Run the SQL from: /home/dentaldiamondhn/clerk/database/migrations/simple_rls_fix.sql');
    } else {
      console.log('\n✅ RLS access is working!');
      console.log(`📊 Found ${count || 0} total records`);
      console.log(`📋 Sample records: ${records?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRLSAccess();
