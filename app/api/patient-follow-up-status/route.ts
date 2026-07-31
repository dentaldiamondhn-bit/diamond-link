import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pacienteId = searchParams.get('paciente_id');

    console.log('GET patient-follow-up-status', { pacienteId });

    const supabase = createServiceClient();

    let query = supabase
      .from('patient_follow_up_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (pacienteId) {
      query = query.eq('paciente_id', pacienteId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Data fetched:', data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paciente_id, treatment_date, notes } = body;

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('patient_follow_up_status')
      .insert([{
        paciente_id,
        treatment_date,
        notes
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, whatsapp_sent, patient_responded, appointment_scheduled, custom_whatsapp_message } = body;

    const supabase = createServiceClient();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (whatsapp_sent !== undefined) updateData.whatsapp_sent = whatsapp_sent;
    if (patient_responded !== undefined) updateData.patient_responded = patient_responded;
    if (appointment_scheduled !== undefined) updateData.appointment_scheduled = appointment_scheduled;
    if (custom_whatsapp_message !== undefined) updateData.custom_whatsapp_message = custom_whatsapp_message;

    const { data, error } = await supabase
      .from('patient_follow_up_status')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
