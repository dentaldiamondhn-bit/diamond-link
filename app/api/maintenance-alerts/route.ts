import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Prevent static generation for this API route
export const revalidate = 0;

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

    // Query the maintenance_alerts table
    let query = supabase
      .from('maintenance_alerts')
      .select('*');

    if (includeAll) {
      query = query.order('created_at', { ascending: false });
    } else {
      const now = new Date().toISOString();
      query = query
        .in('status', ['SCHEDULED', 'ACTIVE'])
        .lte('maintenance_start', now)
        .gte('maintenance_end', now)
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
