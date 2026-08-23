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
      .eq('patients.clerk_user_id', userId)
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

    // First verify the estudio belongs to the user
    const { data: existingEstudio, error: verifyError } = await supabase
      .from('estudios_periodontales')
      .select(`
        id,
        patients!inner(clerk_user_id)
      `)
      .eq('id', estudioId)
      .eq('patients.clerk_user_id', userId)
      .single();

    if (verifyError || !existingEstudio) {
      return NextResponse.json({ error: 'Estudio not found or unauthorized' }, { status: 404 });
    }

    // Update the estudio periodontal
    const { data, error } = await supabase
      .from('estudios_periodontales')
      .update({
        doctor_id: body.doctor_id || null,
        fecha_estudio: body.fecha_estudio,
        indice_placa: body.indice_placa || null,
        indice_sangrado: body.indice_sangrado || null,
        nivel_insercion_clinica: body.nivel_insercion_clinica || null,
        furcaciones: body.furcaciones || 'no-evaluado',
        observaciones_generales: body.observaciones_generales || null,
        plan_tratamiento: body.plan_tratamiento || {},
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
        vestibular_mesial: measurement.vestibular?.mesial || null,
        vestibular_medio: measurement.vestibular?.medio || null,
        vestibular_distal: measurement.vestibular?.distal || null,
        palatino_mesial: measurement.palatino?.mesial || null,
        palatino_medio: measurement.palatino?.medio || null,
        palatino_distal: measurement.palatino?.distal || null,
        movilidad: parseInt(measurement.movilidad) || 0,
        sangrado: measurement.sangrado || false,
        placa: measurement.placa || false,
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

    // Verify the estudio belongs to the user before deleting
    const { data: existingEstudio, error: verifyError } = await supabase
      .from('estudios_periodontales')
      .select(`
        id,
        patients!inner(clerk_user_id)
      `)
      .eq('id', estudioId)
      .eq('patients.clerk_user_id', userId)
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
