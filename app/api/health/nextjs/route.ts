import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const latency = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'operational',
      service: 'nextjs',
      version: process.env.npm_package_version || 'unknown',
      timestamp: new Date().toISOString(),
      uptime: process.uptime?.() || 0
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    return NextResponse.json({
      status: 'offline',
      service: 'nextjs',
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}