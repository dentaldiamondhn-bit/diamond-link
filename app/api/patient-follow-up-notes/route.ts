import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const followUpStatusId = searchParams.get('follow_up_status_id');
    const pacienteId = searchParams.get('paciente_id');

    if (!followUpStatusId && !pacienteId) {
      return NextResponse.json({ error: 'follow_up_status_id or paciente_id is required' }, { status: 400 });
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
      if (statusIds.length === 0) return NextResponse.json([]);
      query = query.in('follow_up_status_id', statusIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching follow-up notes:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { follow_up_status_id, message, user_id, user_name, user_image } = body;

    if (!follow_up_status_id || !message) {
      return NextResponse.json({ error: 'follow_up_status_id and message are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('patient_follow_up_notes')
      .insert({
        follow_up_status_id,
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
