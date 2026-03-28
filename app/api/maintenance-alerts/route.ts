import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/maintenance-alerts - Fetch active maintenance alerts
export async function GET(request: NextRequest) {
  try {
    // Create public Supabase client (no auth needed for maintenance alerts)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';

    // Get active maintenance tickets (these are the alerts)
    let query = supabase
      .from('tickets')
      .select('id, title, description, maintenance_start, maintenance_end, priority, created_at')
      .eq('type', 'MAINTENANCE');

    if (includeAll) {
      // Get all maintenance tickets for admin view
      query = query.order('created_at', { ascending: false });
    } else {
      // Get only active maintenance tickets for banner
      const now = new Date().toISOString();
      query = query
        .eq('status', 'OPEN')
        .or(`maintenance_start.lte.${now},maintenance_end.gte.${now}`)
        .order('maintenance_start', { ascending: true });
    }

    const { data: maintenanceAlerts, error } = await query;

    if (error) {
      console.error('Error fetching maintenance alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch maintenance alerts' }, { status: 500 });
    }

    return NextResponse.json({ 
      alerts: maintenanceAlerts || [],
      count: maintenanceAlerts?.length || 0
    });

  } catch (error) {
    console.error('Maintenance alerts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
