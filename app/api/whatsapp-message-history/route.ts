import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const pacienteId = searchParams.get('paciente_id');

    if (!pacienteId) {
      return NextResponse.json({ error: 'paciente_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('whatsapp_message_history')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching whatsapp message history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paciente_id, message_text, follow_up_status_id } = body;

    if (!paciente_id || !message_text) {
      return NextResponse.json({ error: 'paciente_id and message_text are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('whatsapp_message_history')
      .insert({
        paciente_id,
        message_text,
        follow_up_status_id: follow_up_status_id || null,
        sent_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving whatsapp message history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
