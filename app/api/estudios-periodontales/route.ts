import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const pacienteId = searchParams.get('paciente_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const dateFilter = searchParams.get('date');

    let query = supabase
      .from('estudios_periodontales')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('paciente_id', (await supabase
        .from('patients')
        .select('paciente_id')
        .eq('clerk_user_id', userId)
        .limit(1)
      ).data?.[0]?.paciente_id || '')
      .order('fecha_estudio', { ascending: false });

    // Apply filters
    if (pacienteId) {
      query = query.eq('paciente_id', pacienteId);
    }

    if (search) {
      query = query.or(`observaciones_generales.ilike.%${search}%,fecha_estudio.ilike.%${search}%`);
    }

    if (dateFilter) {
      query = query.eq('fecha_estudio', dateFilter);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('estudios_periodontales')
      .select('*', { count: 'exact', head: true })
      .eq('paciente_id', pacienteId)
      .eq('paciente_id', (await supabase
        .from('patients')
        .select('paciente_id')
        .eq('clerk_user_id', userId)
        .limit(1)
      ).data?.[0]?.paciente_id || '');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching estudios periodontales:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in estudios periodontales GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createSupabaseClient();

    // Validate required fields
    const { paciente_id, doctor_id, fecha_estudio, mediciones } = body;
    
    if (!paciente_id || !fecha_estudio) {
      return NextResponse.json({ 
        error: 'Missing required fields: paciente_id, fecha_estudio' 
      }, { status: 400 });
    }

    // Verify patient belongs to user
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('paciente_id')
      .eq('paciente_id', paciente_id)
      .eq('clerk_user_id', userId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found or unauthorized' }, { status: 404 });
    }

    // Create the estudio periodontal
    const { data, error } = await supabase
      .from('estudios_periodontales')
      .insert({
        paciente_id,
        doctor_id: doctor_id || null,
        fecha_estudio,
        indice_placa: body.indice_placa || null,
        indice_sangrado: body.indice_sangrado || null,
        nivel_insercion_clinica: body.nivel_insercion_clinica || null,
        furcaciones: body.furcaciones || 'no-evaluado',
        observaciones_generales: body.observaciones_generales || null,
        plan_tratamiento: body.plan_tratamiento || {},
        creado_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating estudio periodontal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert tooth measurements if provided
    if (mediciones && Array.isArray(mediciones) && mediciones.length > 0) {
      const measurementsWithStudyId = mediciones.map(measurement => ({
        estudio_id: data.id,
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
        console.error('Error inserting mediciones:', measurementsError);
        // Rollback the estudio if measurements fail
        await supabase
          .from('estudios_periodontales')
          .delete()
          .eq('id', data.id);
        
        return NextResponse.json({ error: 'Failed to save measurements' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'Estudio periodontal created successfully',
      data 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in estudios periodontales POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
