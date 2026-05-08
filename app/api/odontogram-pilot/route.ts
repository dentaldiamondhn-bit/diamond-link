export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paciente_id, datos_odontograma, notas } = body;

    if (!paciente_id || !datos_odontograma) {
      return NextResponse.json({ error: 'Patient ID and odontogram data are required' }, { status: 400 });
    }

    // Get the current max version for this patient
    const { data: existingOdontograms } = await supabase
      .from('odontogram_pilots')
      .select('version')
      .eq('paciente_id', paciente_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingOdontograms && existingOdontograms.length > 0 
      ? existingOdontograms[0].version + 1 
      : 1;

    // Set all existing odontograms for this patient to inactive
    await supabase
      .from('odontogram_pilots')
      .update({ activo: false })
      .eq('paciente_id', paciente_id);

    // Create new odontogram-pilot
    const { data: newOdontogram, error } = await supabase
      .from('odontogram_pilots')
      .insert({
        paciente_id,
        datos_odontograma,
        notas,
        version: nextVersion,
        activo: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating odontogram-pilot:', error);
      return NextResponse.json({ error: 'Failed to create odontogram-pilot' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Odontogram-pilot created successfully',
      odontogram: newOdontogram 
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/odontogram-pilot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Fetch all odontogram-pilots for the patient
    const { data: odontograms, error } = await supabase
      .from('odontogram_pilots')
      .select('*')
      .eq('paciente_id', patientId)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching odontogram-pilots:', error);
      return NextResponse.json({ error: 'Failed to fetch odontogram-pilots' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Odontogram-pilots found',
      odontograms 
    });
  } catch (error) {
    console.error('Error in GET /api/odontogram-pilot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
