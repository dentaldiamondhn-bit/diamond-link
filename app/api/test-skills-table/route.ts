import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test endpoint to check skills table accessibility
export async function GET(request: NextRequest) {
  try {
    console.log('Testing skills table access...');
    
    // Test 1: Check if table exists
    const { data: testData, error: testError } = await supabase
      .from('skills')
      .select('id, name')
      .limit(1);

    console.log('Test query result:', { testData, testError });

    if (testError) {
      console.error('Skills table error:', testError);
      return NextResponse.json({ 
        error: 'Skills table query failed',
        details: testError,
        tableExists: false
      });
    }

    // Test 2: Count total skills
    const { count, error: countError } = await supabase
      .from('skills')
      .select('*', { count: 'exact', head: true });

    console.log('Skills count:', { count, countError });

    return NextResponse.json({ 
      success: true,
      tableExists: true,
      totalSkills: count,
      sampleData: testData
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
