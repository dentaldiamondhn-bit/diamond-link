import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Prevent static generation for this API route
export const revalidate = 0;

const supabase = createClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Fetch all odontogram-pilot versions for the patient
    const { data: odontograms, error } = await supabase
      .from('odontogram_pilots')
      .select('*')
      .eq('paciente_id', patientId)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching odontogram-pilot history:', error);
      return NextResponse.json({ error: 'Failed to fetch odontogram-pilot history' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Odontogram-pilot history found',
      history: odontograms 
    });
  } catch (error) {
    console.error('Error in GET /api/odontogram-pilot/history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}