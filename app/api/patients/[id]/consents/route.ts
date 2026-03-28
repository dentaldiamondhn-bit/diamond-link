import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;

    // Get patient consents - use correct table name and field names
    const { data: consents, error } = await supabase
      .from('consentimientos')
      .select('*')
      .eq('paciente_id', patientId)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error fetching consents:', error);
      return NextResponse.json({ error: 'Failed to fetch consents', details: error.message }, { status: 500 });
    }

    return NextResponse.json(consents || []);
  } catch (error) {
    console.error('Error in consents API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
