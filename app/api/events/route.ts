import { NextResponse } from 'next/server';
import { createServerServiceClient } from '@/lib/supabase/server';
import { authorizeCalendar } from '@/lib/calendarAuth';

export const runtime = 'nodejs';

export async function GET() {
  const authz = await authorizeCalendar();
  if ('response' in authz) return authz.response;
  const { userId } = authz;

  try {
    const supabase = createServerServiceClient();
    const { data, error: dbError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
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
      date: date || new Date().toISOString().slice(0, 10),
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
    const { error: dbError } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) throw dbError;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}