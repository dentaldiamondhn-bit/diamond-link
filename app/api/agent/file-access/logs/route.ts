import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOperationLogs } from '@/lib/file-access-log-store';

export const dynamic = 'force-dynamic';

// GET /api/agent/file-access/logs - Get operation logs (admin only)
export async function GET(request: NextRequest) {
  void request;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, check if user is admin
    // For now, return all logs
    return NextResponse.json({
      logs: getOperationLogs(),
    });
  } catch (error) {
    console.error('File access logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}