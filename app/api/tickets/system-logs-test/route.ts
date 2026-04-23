import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== SYSTEM LOGS TEST API CALLED ===');
  
  try {
    return NextResponse.json({ 
      message: 'TEST API is working!',
      timestamp: new Date().toISOString(),
      test: true,
      path: '/api/tickets/system-logs-test'
    });
  } catch (error) {
    console.error('TEST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
