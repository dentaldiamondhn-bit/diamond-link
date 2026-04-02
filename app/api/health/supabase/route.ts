import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try multiple tables to ensure connection works
    let error = null;
    let testTable = '';
    
    // Try patients table first (most likely to exist)
    const { error: patientsError } = await supabase.from('patients').select('id').limit(1);
    if (!patientsError) {
      testTable = 'patients';
    } else {
      // Try tickets table as fallback
      const { error: ticketsError } = await supabase.from('tickets').select('id').limit(1);
      if (!ticketsError) {
        testTable = 'tickets';
      } else {
        // Final fallback - try any basic query
        const { error: basicError } = await supabase.from('pg_catalog.pg_tables').select('tablename').limit(1);
        error = basicError;
        testTable = 'pg_catalog.pg_tables';
      }
    }
    
    const latency = Date.now() - startTime;
    
    if (error) {
      return NextResponse.json({
        status: 'degraded',
        service: 'supabase',
        latency,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
    
    return NextResponse.json({
      status: 'operational',
      service: 'supabase',
      latency,
      testTable,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    return NextResponse.json({
      status: 'offline',
      service: 'supabase',
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}