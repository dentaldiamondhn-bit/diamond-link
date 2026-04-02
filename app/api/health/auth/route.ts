import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    
    if (!clerkPublishableKey) {
      throw new Error('Clerk configuration missing');
    }
    
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'operational',
      service: 'clerk-auth',
      latency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    return NextResponse.json({
      status: 'offline',
      service: 'clerk-auth',
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}