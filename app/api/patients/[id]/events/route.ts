import { NextRequest, NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { authorizeCalendar } from '@/lib/calendarAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;

  try {
    const { id } = await params;
    const patientId = id;

    // Canonical model (calendario Phase 0): patient events live in the `events`
    // family, not the removed `calendar_events` UUID layer.
    const supabase = createServerServiceClient();
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: 'Failed to fetch events', details: error.message }, { status: 500 });
    }

    return NextResponse.json(events || []);
  } catch (error) {
    console.error('Error in events API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}