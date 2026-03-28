import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;

    // Get patient treatments from completed treatments
    const { data: treatments, error } = await supabase
      .from('tratamientos_completados')
      .select('*')
      .eq('paciente_id', patientId)
      .order('fecha_cita', { ascending: false });

    if (error) {
      console.error('Error fetching treatments:', error);
      return NextResponse.json({ error: 'Failed to fetch treatments', details: error.message }, { status: 500 });
    }

    return NextResponse.json(treatments || []);
  } catch (error) {
    console.error('Error in treatments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
