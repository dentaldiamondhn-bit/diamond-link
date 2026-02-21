import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST ENDPOINT CALLED ===');
    const { pacienteId } = await request.json();
    console.log('Patient ID:', pacienteId);

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('historia_clinica_ortodoncia')
      .select('*')
      .eq('paciente_id', pacienteId);

    console.log('=== TEST ENDPOINT RESULT ===');
    console.log('Data:', data);
    console.log('Error:', error);

    return NextResponse.json({ data, error });
  } catch (error) {
    console.error('TEST ENDPOINT ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
