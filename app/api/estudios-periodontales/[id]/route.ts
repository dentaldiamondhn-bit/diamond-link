import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseClient();
    const estudioId = id;

    const { data, error } = await supabase
      .from('estudios_periodontales')
      .select(`
        *,
        patients(nombre_completo),
        doctors(name),
        mediciones_periodontales(*)
      `)
      .eq('id', estudioId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Estudio not found' }, { status: 404 });
      }
      console.error('Error fetching estudio periodontal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in estudio periodontal GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createSupabaseClient();
    const estudioId = id;

    // Verify the estudio exists (patients are not scoped per Clerk user in
    // this app, so authorization is the login gate above)
    const { data: existingEstudio, error: verifyError } = await supabase
      .from('estudios_periodontales')
      .select('id')
      .eq('id', estudioId)
      .single();

    if (verifyError || !existingEstudio) {
      return NextResponse.json({ error: 'Estudio not found or unauthorized' }, { status: 404 });
    }

    // Update the estudio periodontal
    const { data, error } = await supabase
      .from('estudios_periodontales')
      .update({
        doctor_id: body.doctor_id || null,
        atendido_por: body.atendido_por || null,
        fecha_estudio: body.fecha_estudio,
        indice_placa: body.indice_placa || null,
        indice_sangrado: body.indice_sangrado || null,
        nivel_insercion_clinica: body.nivel_insercion_clinica || null,
        furcaciones: body.furcaciones || 'no-evaluado',
        observaciones_generales: body.observaciones_generales || null,
        objetivo_estudio: body.objetivo_estudio || null,
        plan_tratamiento: body.plan_tratamiento || {},
        clasificacion: body.clasificacion || null,
        general_health_data: body.general_health_data || null,
        microbiology_data: body.microbiology_data || null,
        interval_data: body.interval_data || null,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', estudioId)
      .select()
      .single();

    if (error) {
      console.error('Error updating estudio periodontal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update tooth measurements if provided
    if (body.mediciones && Array.isArray(body.mediciones)) {
      // Delete existing measurements
      await supabase
        .from('mediciones_periodontales')
        .delete()
        .eq('estudio_id', estudioId);

      // Insert new measurements
      const measurementsWithStudyId = body.mediciones.map((measurement: any) => ({
        estudio_id: estudioId,
        numero_diente: measurement.diente,
        vestibular_mesial: measurement.vestibular?.mesial ?? null,
        vestibular_medio: measurement.vestibular?.medio ?? null,
        vestibular_distal: measurement.vestibular?.distal ?? null,
        palatino_mesial: measurement.palatino?.mesial ?? null,
        palatino_medio: measurement.palatino?.medio ?? null,
        palatino_distal: measurement.palatino?.distal ?? null,
        vestibular_gm_mesial: measurement.vestibularGm?.mesial ?? null,
        vestibular_gm_medio: measurement.vestibularGm?.medio ?? null,
        vestibular_gm_distal: measurement.vestibularGm?.distal ?? null,
        palatino_gm_mesial: measurement.palatinoGm?.mesial ?? null,
        palatino_gm_medio: measurement.palatinoGm?.medio ?? null,
        palatino_gm_distal: measurement.palatinoGm?.distal ?? null,
        vestibular_al_mesial: measurement.vestibularAl?.mesial ?? null,
        vestibular_al_medio: measurement.vestibularAl?.medio ?? null,
        vestibular_al_distal: measurement.vestibularAl?.distal ?? null,
        palatino_al_mesial: measurement.palatinoAl?.mesial ?? null,
        palatino_al_medio: measurement.palatinoAl?.medio ?? null,
        palatino_al_distal: measurement.palatinoAl?.distal ?? null,
        movilidad: parseInt(measurement.movilidad) || 0,
        sangrado: measurement.sangrado || false,
        sangrado_vestibular_mesial: measurement.sangradoVestibular?.mesial ?? null,
        sangrado_vestibular_medio: measurement.sangradoVestibular?.medio ?? null,
        sangrado_vestibular_distal: measurement.sangradoVestibular?.distal ?? null,
        sangrado_palatino_mesial: measurement.sangradoPalatino?.mesial ?? null,
        sangrado_palatino_medio: measurement.sangradoPalatino?.medio ?? null,
        sangrado_palatino_distal: measurement.sangradoPalatino?.distal ?? null,
        placa: measurement.placa || false,
        placa_vestibular_mesial: measurement.placaVestibular?.mesial ?? null,
        placa_vestibular_medio: measurement.placaVestibular?.medio ?? null,
        placa_vestibular_distal: measurement.placaVestibular?.distal ?? null,
        placa_palatino_mesial: measurement.placaPalatino?.mesial ?? null,
        placa_palatino_medio: measurement.placaPalatino?.medio ?? null,
        placa_palatino_distal: measurement.placaPalatino?.distal ?? null,
        implante: parseInt(measurement.implante) || 0,
        furcacion_b: measurement.furcacionB ?? null,
        furcacion_mp: measurement.furcacionMp ?? null,
        furcacion_dp: measurement.furcacionDp ?? null,
        furcacion_l: measurement.furcacionL ?? null,
        observaciones_diente: measurement.observaciones || null
      }));

      const { error: measurementsError } = await supabase
        .from('mediciones_periodontales')
        .insert(measurementsWithStudyId);

      if (measurementsError) {
        console.error('Error updating mediciones:', measurementsError);
        return NextResponse.json({ error: 'Failed to update measurements' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'Estudio periodontal updated successfully',
      data 
    });

  } catch (error) {
    console.error('Error in estudio periodontal PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseClient();
    const estudioId = id;

    // Verify the estudio exists before deleting (see PUT note on scoping)
    const { data: existingEstudio, error: verifyError } = await supabase
      .from('estudios_periodontales')
      .select('id')
      .eq('id', estudioId)
      .single();

    if (verifyError || !existingEstudio) {
      return NextResponse.json({ error: 'Estudio not found or unauthorized' }, { status: 404 });
    }

    // Delete the estudio (measurements will be deleted by CASCADE)
    const { error } = await supabase
      .from('estudios_periodontales')
      .delete()
      .eq('id', estudioId);

    if (error) {
      console.error('Error deleting estudio periodontal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Estudio periodontal deleted successfully' 
    });

  } catch (error) {
    console.error('Error in estudio periodontal DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
