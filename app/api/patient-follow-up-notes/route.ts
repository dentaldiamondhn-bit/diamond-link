import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const jsonNoCache = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const followUpStatusId = searchParams.get('follow_up_status_id');
    const pacienteId = searchParams.get('paciente_id');
    const pacientes = searchParams.get('pacientes');

    if (!followUpStatusId && !pacienteId && !pacientes) {
      return jsonNoCache({ error: 'follow_up_status_id or paciente_id is required' }, 400);
    }

    // Batch mode: return { [paciente_id]: notes[] } for the fallback poll.
    if (pacientes) {
      const ids = pacientes.split(',').map(s => s.trim()).filter(Boolean);
      const byPaciente: Record<string, any[]> = {};
      for (const id of ids) byPaciente[id] = [];
      if (ids.length === 0) return jsonNoCache(byPaciente);

      const { data, error } = await supabase
        .from('patient_follow_up_notes')
        .select('*')
        .in('paciente_id', ids)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching follow-up notes (batch):', error);
        return jsonNoCache({ error: error.message }, 400);
      }

      for (const note of (data || [])) {
        if (note.paciente_id && byPaciente[note.paciente_id]) {
          byPaciente[note.paciente_id].push(note);
        }
      }
      return jsonNoCache(byPaciente);
    }

    let query = supabase
      .from('patient_follow_up_notes')
      .select('*')
      .order('created_at', { ascending: true });

    if (followUpStatusId) {
      query = query.eq('follow_up_status_id', followUpStatusId);
    } else if (pacienteId) {
      const { data: statusRows } = await supabase
        .from('patient_follow_up_status')
        .select('id')
        .eq('paciente_id', pacienteId);
      const statusIds = (statusRows || []).map((s: any) => s.id);
      if (statusIds.length === 0) return jsonNoCache([]);
      query = query.in('follow_up_status_id', statusIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching follow-up notes:', error);
      return jsonNoCache({ error: error.message }, 400);
    }

    return jsonNoCache(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { follow_up_status_id, message, user_id, user_name, user_image, paciente_id } = body;

    if (!follow_up_status_id || !message) {
      return NextResponse.json({ error: 'follow_up_status_id and message are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('patient_follow_up_notes')
      .insert({
        follow_up_status_id,
        paciente_id: paciente_id || null,
        user_id: user_id || null,
        user_name: user_name || null,
        user_image: user_image || null,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving follow-up note:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('patient_follow_up_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting follow-up note:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
