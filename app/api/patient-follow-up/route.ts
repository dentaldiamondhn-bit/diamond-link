export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('tratamientos_completados')
      .select(`
        paciente_id,
        fecha_cita,
        patients (
          paciente_id,
          nombre_completo,
          telefono
        ),
        vista_tratamientos_realizados_detalles (
          nombre_tratamiento
        )
      `)
      .order('fecha_cita', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching treatments:', error);
      throw error;
    }

    return NextResponse.json({
      message: 'Follow-up patients retrieved successfully - FRONTEND FILTERING',
      data: data || []
    });
  } catch (error) {
    console.error('Error in GET /api/patient-follow-up:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch follow-up patients',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
