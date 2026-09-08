import { NextRequest, NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { authorizeCalendar } from '@/lib/calendarAuth';
import { isEventMember, isEventOwner } from '@/lib/calendarAccess';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const { id } = await params;
    const supabase = createServerServiceClient();

    if (!(await isEventMember(supabase, id, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('event_reminders')
      .select('*')
      .eq('event_id', id)
      .order('minutes_before', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const { id } = await params;
    const body = await req.json();
    const { minutes_before } = body;

    if (typeof minutes_before !== 'number' || minutes_before < 0) {
      return NextResponse.json({ error: 'Invalid minutes_before' }, { status: 400 });
    }

    const reminderTime = new Date();
    reminderTime.setMinutes(reminderTime.getMinutes() - minutes_before);
    const isoReminderTime = reminderTime.toISOString();

    const supabase = createServerServiceClient();

    if (!(await isEventOwner(supabase, id, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('event_reminders')
      .insert({
        event_id: id,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const { id } = await params;
    const body = await req.json();
    const { reminder_id } = body;

    const supabase = createServerServiceClient();

    if (!(await isEventOwner(supabase, id, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = supabase.from('event_reminders').delete().eq('event_id', id);
    if (reminder_id) query = query.eq('id', reminder_id);

    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}