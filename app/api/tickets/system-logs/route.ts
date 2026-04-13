import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { checkPermission, Permission } from '@/lib/rbac';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET /api/tickets/system-logs - Fetch system logs
export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from session claims and map to UserRole enum format
    const rawRole = (sessionClaims as any)?.metadata?.role as string || 'STAFF';
    
    // Map role names to UserRole enum format
    const roleMapping: Record<string, string> = {
      'tech_support': 'TECH_SUPPORT',
      'admin': 'ADMIN', 
      'doctor': 'DOCTOR',
      'staff': 'STAFF'
    };
    
    const userRole = roleMapping[rawRole] || 'STAFF';

    // Check permission to view system logs
    if (!checkPermission(userRole as any, 'VIEW_SYSTEM_LOGS')) {
      return NextResponse.json({ error: 'Insufficient permissions to view system logs' }, { status: 403 });
    }

    // Fetch system update activities
    const { data: logs, error } = await supabase
      .from('ticket_activities')
      .select(`
        *,
        user:user_id(id, name, email, role)
      `)
      .eq('activity_type', 'SYSTEM_UPDATE')
      .or('activity_type.eq.TICKET_CREATED,activity_type.eq.ATTACHMENT_ADDED')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching system logs:', error);
      return NextResponse.json({ error: 'Failed to fetch system logs' }, { status: 500 });
    }

    return NextResponse.json({ 
      logs: logs || [],
      count: logs?.length || 0
    });
  } catch (error) {
    console.error('System logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
