import { NextResponse } from 'next/server';


export async function GET() {
  return NextResponse.json({ 
    logs: [
      {
        id: 1,
        activity_type: 'SYSTEM_UPDATE',
        content: 'System maintenance completed',
        created_at: new Date().toISOString(),
        level: 'INFO'
      },
      {
        id: 2,
        activity_type: 'TICKET_CREATED',
        content: 'New support ticket created',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        level: 'INFO'
      }
    ],
    count: 2,
    message: 'System logs loaded successfully'
  });
}
