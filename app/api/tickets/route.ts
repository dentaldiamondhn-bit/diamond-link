import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TicketService } from '@/services/ticketService';
import { CreateTicketData, UpdateTicketData, TicketStatus, UserRole } from '@/types/ticket';
import { createClient } from '@supabase/supabase-js';
import { checkPermission, requirePermission, Permission } from '@/lib/rbac';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET /api/tickets - Fetch tickets with filters
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      status: (searchParams.get('status') as TicketStatus) || undefined,
      type: (searchParams.get('type') as any) || undefined,
      priority: (searchParams.get('priority') as any) || undefined,
      assignee_id: searchParams.get('assignee_id') || undefined,
      creator_id: searchParams.get('creator_id') || undefined,
      search: searchParams.get('search') || undefined
    };

    const result = await TicketService.getTickets(filters);
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }

    return NextResponse.json({ tickets: result.data || [] });
  } catch (error) {
    console.error('Tickets API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tickets - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from session claims
    const userRole = (sessionClaims as any)?.metadata?.role as UserRole || UserRole.STAFF;

    // Check permission to create tickets
    if (!checkPermission(userRole, 'CREATE_TICKET')) {
      return NextResponse.json({ error: 'Insufficient permissions to create tickets' }, { status: 403 });
    }

    // Get user token for Supabase auth
    const token = await auth().then((auth) => auth?.getToken());
    
    if (!token) {
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    // Create Supabase client with user token
    const supabaseWithAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { title, description, type, priority, due_date, is_reminder, maintenance_start, maintenance_end, patient_id } = await request.json();
    
    const ticketData = {
      title,
      description,
      type,
      priority,
      due_date: due_date || null,
      is_reminder: is_reminder || false,
      maintenance_start: maintenance_start || null,
      maintenance_end: maintenance_end || null,
      creator_id: userId,
      patient_id: patient_id || null
    };

    // Validate required fields
    if (!ticketData.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate maintenance window if type is maintenance
    if (ticketData.type === 'maintenance' && (!ticketData.maintenance_start || !ticketData.maintenance_end)) {
      return NextResponse.json({ error: 'Maintenance start and end times are required for maintenance tickets' }, { status: 400 });
    }

    // Validate maintenance window logic
    if (ticketData.maintenance_start && ticketData.maintenance_end) {
      const startTime = new Date(ticketData.maintenance_start);
      const endTime = new Date(ticketData.maintenance_end);
      if (endTime <= startTime) {
        return NextResponse.json({ error: 'Maintenance end time must be after start time' }, { status: 400 });
      }
    }

    // Check permission for patient case tickets
    if (ticketData.type === 'PATIENT_CASE' && !checkPermission(userRole, 'CREATE_PATIENT_CASE')) {
      return NextResponse.json({ error: 'Insufficient permissions to create patient cases' }, { status: 403 });
    }

    const result = await TicketService.createTicket(ticketData, userId, supabaseWithAuth);
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    return NextResponse.json({ ticket: result.data }, { status: 201 });
  } catch (error) {
    console.error('Create ticket API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
