import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function getUserAndToken(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  const userId = req.headers.get('x-user-id') || '';

  if (!userId) {
    return { user: null, error: 'Unauthorized' };
  }

  return { user: { id: userId }, error: null };
}

export async function GET(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  try {
    const supabase = createServiceClient();
    const { data, error: dbError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (dbError) throw dbError;
    return new Response(JSON.stringify(data || []), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    },
  });
}

export async function POST(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

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
      patient_id
    } = body;

    const supabase = createServiceClient();
    const baseInsert: any = {
      user_id: user.id,
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

    const { data, error: dbError } = await supabase
      .from('events')
      .insert(baseInsert)
      .select()
      .single();

    if (dbError) {
      return new Response(
        JSON.stringify({
          error: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
        }),
        { status: 400 }
      );
    }
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    const supabase = createServiceClient();
    const { data, error: dbError } = await supabase
      .from('events')
      .update({
        ...updates,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (dbError) {
      return new Response(
        JSON.stringify({
          error: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
        }),
        { status: 400 }
      );
    }
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { user, error } = getUserAndToken(req);
  if (error) return new Response(JSON.stringify({ error }), { status: 401 });

  try {
    const body = await req.json();
    const { id } = body;

    const supabase = createServiceClient();
    const { error: dbError } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (dbError) throw dbError;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
