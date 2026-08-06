import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { pacienteId } = await request.json();

    if (!pacienteId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('historia_clinica_ortodoncia')
      .select('*')
      .eq('paciente_id', pacienteId)
      .limit(1);

    if (error) {
      console.error('API Error checking orthodontic history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const history = data && data.length > 0 ? data[0] : null;

    return NextResponse.json({ data: history });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
