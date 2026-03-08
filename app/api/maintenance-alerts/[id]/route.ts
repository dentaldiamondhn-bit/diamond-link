import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { MaintenanceService } from '@/services/maintenanceService';
import { checkPermission } from '@/lib/rbac';

// GET /api/maintenance-alerts/[id] - Get specific maintenance alert
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user token for Supabase auth
    const token = await auth().then((auth) => auth?.getToken());
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const maintenanceService = new MaintenanceService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const result = await maintenanceService.getAllMaintenanceAlerts();
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to fetch maintenance alerts' }, { status: 500 });
    }

    // Find the specific alert
    const alert = result.data.find(a => a.id === params.id);
    
    if (!alert) {
      return NextResponse.json({ error: 'Maintenance alert not found' }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Error in GET /api/maintenance-alerts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/maintenance-alerts/[id] - Update maintenance alert
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from session claims
    const userRole = (sessionClaims as any)?.metadata?.role as string || 'STAFF';

    // Check permission to manage maintenance alerts
    if (!checkPermission(userRole as any, 'VIEW_SYSTEM_LOGS')) {
      return NextResponse.json({ error: 'Insufficient permissions to update maintenance alerts' }, { status: 403 });
    }

    // Get user token for Supabase auth
    const token = await auth().then((auth) => auth?.getToken());
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create authenticated Supabase client
    const supabase = createClient(
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

    const updates = await request.json();

    // Validate maintenance window if provided
    if (updates.maintenance_start && updates.maintenance_end) {
      const startTime = new Date(updates.maintenance_start);
      const endTime = new Date(updates.maintenance_end);
      if (endTime <= startTime) {
        return NextResponse.json({ error: 'Maintenance end time must be after start time' }, { status: 400 });
      }
    }

    const maintenanceService = new MaintenanceService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const result = await maintenanceService.updateMaintenanceAlert(params.id, updates);
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to update maintenance alert' }, { status: 500 });
    }

    if (!result.data) {
      return NextResponse.json({ error: 'Maintenance alert not found' }, { status: 404 });
    }

    return NextResponse.json({ alert: result.data });
  } catch (error) {
    console.error('Error in PUT /api/maintenance-alerts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/maintenance-alerts/[id] - Delete maintenance alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from session claims
    const userRole = (sessionClaims as any)?.metadata?.role as string || 'STAFF';

    // Check permission to manage maintenance alerts
    if (!checkPermission(userRole as any, 'VIEW_SYSTEM_LOGS')) {
      return NextResponse.json({ error: 'Insufficient permissions to delete maintenance alerts' }, { status: 403 });
    }

    // Get user token for Supabase auth
    const token = await auth().then((auth) => auth?.getToken());
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const maintenanceService = new MaintenanceService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const result = await maintenanceService.deleteMaintenanceAlert(params.id);
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to delete maintenance alert' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Maintenance alert deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/maintenance-alerts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
