import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function getUserId(req: NextRequest) {
  return req.headers.get('x-user-id') || '';
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const nowLocal = new Date();
    const startOfTodayUTC = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()).toISOString();
    const nextWeekLocal = new Date();
    nextWeekLocal.setDate(nextWeekLocal.getDate() + 14);
    const nextWeekUTC = nextWeekLocal.toISOString();

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startOfTodayUTC.slice(0, 10))
      .lte('date', nextWeekUTC.slice(0, 10))
      .neq('status', 'cancelled')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 400 });
    }

    return NextResponse.json(events || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
