import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Fetch the active odontogram for the patient
    const { data: odontogram, error } = await supabase
      .from('odontograms')
      .select('*')
      .eq('paciente_id', patientId)
      .eq('activo', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching odontogram:', error);
      return NextResponse.json({ error: 'Failed to fetch odontogram' }, { status: 500 });
    }

    if (!odontogram) {
      return NextResponse.json({ 
        message: 'No active odontogram found',
        odontogram: null 
      });
    }

    return NextResponse.json({ 
      message: 'Odontogram found',
      odontogram 
    });
  } catch (error) {
    console.error('Error in GET /api/odontogram/active:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
