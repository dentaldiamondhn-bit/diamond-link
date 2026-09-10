import { NextRequest, NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { authorizeCalendar } from '@/lib/calendarAuth';
import { CLINIC_TIME_ZONE } from '@/calendario/timezone';

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  if (dateFrom && !DATE_RE.test(dateFrom)) {
    return NextResponse.json({ error: 'date_from must be YYYY-MM-DD' }, { status: 400 });
  }
  if (dateTo && !DATE_RE.test(dateTo)) {
    return NextResponse.json({ error: 'date_to must be YYYY-MM-DD' }, { status: 400 });
  }

  try {
    const supabase = createServerServiceClient();
    // Visible events = owned OR invited (matches the `events` RLS predicate and the
    // realtime `event_invitees` binding, so invitee calendars actually populate).
    const { data: inviteeRows } = await supabase
      .from('event_invitees')
      .select('event_id')
      .eq('user_id', userId);
    const inviteeEventIds = (inviteeRows ?? [])
      .map((r) => Number(r.event_id))
      .filter((n) => Number.isFinite(n));

    let query = supabase.from('events').select('*');
    if (inviteeEventIds.length > 0) {
      query = query.or(`user_id.eq.${userId},id.in.(${inviteeEventIds.join(',')})`);
    } else {
      query = query.eq('user_id', userId);
    }

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error: dbError } = await query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (dbError) throw dbError;
    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const body = await req.json();
    const {
      title,
      patient_name,
      date,
      start_time,
      end_time,
      color,
      notes,
      description,
      location,
      event_type,
      status,
      priority,
      reminder_minutes,
      patient_id,
      procedure,
      dentist,
    } = body;

    const supabase = createServerServiceClient();
    const baseInsert: Record<string, unknown> = {
      user_id: userId,
      title: title || `Appointment - ${patient_name}`,
      patient_name: patient_name || '',
      date: date || (() => {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: CLINIC_TIME_ZONE,
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date());
        const v = (t: string) => parts.find(p => p.type === t)?.value || '';
        return `${v('year')}-${v('month')}-${v('day')}`;
      })(),
      start_time: start_time || '09:00',
      end_time: end_time || '09:30',
      color: color || '#0d9488',
      notes: notes || '',
    };

    baseInsert.description = description || '';
    baseInsert.location = location || '';
    baseInsert.event_type = event_type || 'appointment';
    baseInsert.status = status || 'scheduled';
    baseInsert.priority = priority || 'medium';
    baseInsert.reminder_minutes = reminder_minutes ?? 30;
    baseInsert.patient_id = patient_id || null;
    baseInsert.procedure = procedure || '';
    baseInsert.dentist = dentist || '';

    const { data, error: dbError } = await supabase
      .from('events')
      .insert(baseInsert)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        {
          error: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    const supabase = createServerServiceClient();
    const { data, error: dbError } = await supabase
      .from('events')
      .update({ ...updates })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Evento no encontrado o no tienes permiso para editarlo' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
        },
        { status: 400 }
      );
    }
    // Best-effort realtime ping for invited calendars (C13): bumping the invitee
    // rows fires the invitee's `event_invitees` SSE binding → client invalidates →
    // refetches the (now invitee-inclusive) GET. Needs migration 20260909e for the
    // column; if it's not applied yet this call errors harmlessly and is swallowed.
    await supabase
      .from('event_invitees')
      .update({ updated_at: new Date().toISOString() })
      .eq('event_id', id);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const body = await req.json();
    const { id } = body;

    const supabase = createServerServiceClient();
    const { data, error: dbError } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (dbError) throw dbError;
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Evento no encontrado o no tienes permiso para eliminarlo' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}