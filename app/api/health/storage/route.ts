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
    const { data, error } = await supabase.storage.listBuckets();
    
    const latency = Date.now() - startTime;
    
    if (error) {
      return NextResponse.json({
        status: 'degraded',
        service: 'storage',
        latency,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
    
    return NextResponse.json({
      status: 'operational',
      service: 'storage',
      latency,
      buckets: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    return NextResponse.json({
      status: 'offline',
      service: 'storage',
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}