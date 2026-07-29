import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function getUserId(req: NextRequest) {
  return req.headers.get('x-user-id') || '';
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('event_reminders')
      .select('*')
      .eq('event_id', eventId)
      .order('minutes_before', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const body = await req.json();
    const { minutes_before } = body;

    if (typeof minutes_before !== 'number' || minutes_before < 0) {
      return NextResponse.json({ error: 'Invalid minutes_before' }, { status: 400 });
    }

    const reminderTime = new Date();
    reminderTime.setMinutes(reminderTime.getMinutes() - minutes_before);
    // This is just for compatibility; actual reminder_time is derived in save logic.
    const isoReminderTime = reminderTime.toISOString();

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('event_reminders')
      .insert({
        event_id: eventId,
        minutes_before,
        reminder_time: isoReminderTime,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const body = await req.json();
    const { reminder_id } = body;

    const supabase = createServiceClient();

    if (reminder_id) {
      const { error } = await supabase
        .from('event_reminders')
        .delete()
        .eq('event_id', eventId)
        .eq('id', reminder_id);

      if (error) throw error;
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { error } = await supabase
      .from('event_reminders')
      .delete()
      .eq('event_id', eventId);

    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
