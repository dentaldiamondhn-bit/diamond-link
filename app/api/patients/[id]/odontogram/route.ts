import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;

    // Get patient odontogram - use correct table name
    const { data: odontogram, error } = await supabase
      .from('odontograms')
      .select('*')
      .eq('paciente_id', patientId)
      .eq('activo', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching odontogram:', error);
      return NextResponse.json({ error: 'Failed to fetch odontogram', details: error.message }, { status: 500 });
    }

    return NextResponse.json(odontogram);
  } catch (error) {
    console.error('Error in odontogram API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
