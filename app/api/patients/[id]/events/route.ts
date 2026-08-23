import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = id;

    // Get patient events from calendar
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('patient_id', patientId)
      .order('start_date', { ascending: false });

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
