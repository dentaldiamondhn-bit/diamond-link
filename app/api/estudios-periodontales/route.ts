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
      .select(
        '*, mediciones_periodontales(vestibular_mesial, vestibular_medio, vestibular_distal, palatino_mesial, palatino_medio, palatino_distal, vestibular_al_mesial, vestibular_al_medio, vestibular_al_distal, palatino_al_mesial, palatino_al_medio, palatino_al_distal)',
      )
      .order('fecha_estudio', { ascending: false });

    // Apply filters
    if (pacienteId) {
      query = query.eq('paciente_id', pacienteId);
    }

    if (search) {
      query = query.or(`observaciones_generales.ilike.%${search}%`);
    }

    if (dateFilter) {
      query = query.eq('fecha_estudio', dateFilter);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('estudios_periodontales')
      .select('*', { count: 'exact', head: true });

    if (pacienteId) {
      countQuery = countQuery.eq('paciente_id', pacienteId);
    }

    if (dateFilter) {
      countQuery = countQuery.eq('fecha_estudio', dateFilter);
    }

    const { count } = await countQuery;

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching estudios periodontales:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flag each patient's latest version, like odontogram-pilot listByPatient,
    // and attach a clinical snapshot per study (saved indices + mean probing
    // depth and attachment level across all recorded sites).
    let dataWithVersionFlags = data;
    if (data && data.length > 0) {
      const pacienteIds = Array.from(new Set(data.map(row => row.paciente_id)));
      const { data: versionRows, error: versionError } = await supabase
        .from('estudios_periodontales')
        .select('paciente_id, version')
        .in('paciente_id', pacienteIds);

      if (!versionError && versionRows) {
        const maxByPaciente = new Map<string, number>();
        versionRows.forEach(row => {
          const current = maxByPaciente.get(row.paciente_id) || 0;
          if ((row.version || 0) > current) {
            maxByPaciente.set(row.paciente_id, row.version || 0);
          }
        });

        const meanOf = (rows: any[], keys: string[]): number | null => {
          const values = rows
            .flatMap(row => keys.map(key => row[key]))
            .filter(value => typeof value === 'number' && Number.isFinite(value));
          if (values.length === 0) return null;
          const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
          return Math.round(mean * 10) / 10;
        };
        const PD_KEYS = ['vestibular_mesial', 'vestibular_medio', 'vestibular_distal', 'palatino_mesial', 'palatino_medio', 'palatino_distal'];
        const AL_KEYS = ['vestibular_al_mesial', 'vestibular_al_medio', 'vestibular_al_distal', 'palatino_al_mesial', 'palatino_al_medio', 'palatino_al_distal'];

        dataWithVersionFlags = data.map(row => ({
          ...row,
          es_version_actual: maxByPaciente.get(row.paciente_id) === row.version,
          metricas: {
            bop: row.indice_sangrado ?? null,
            pi: row.indice_placa ?? null,
            ps_media: meanOf(row.mediciones_periodontales || [], PD_KEYS),
            nic_medio: meanOf(row.mediciones_periodontales || [], AL_KEYS),
          },
        }));
      }
    }

    return NextResponse.json({
      data: dataWithVersionFlags,
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

    // Verify patient exists. Patients are not scoped per Clerk user anywhere
    // in the app (creation never writes patients.clerk_user_id), so matching
    // the odontogram-pilot/validate-id pattern: existence check only.
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('paciente_id')
      .eq('paciente_id', paciente_id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Per-patient auto-incrementing version, like odontogram-pilot: highest
    // existing version + 1, starting at 1 for the patient's first study.
    const { data: lastVersion } = await supabase
      .from('estudios_periodontales')
      .select('version')
      .eq('paciente_id', paciente_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = ((lastVersion && lastVersion[0]?.version) || 0) + 1;

    // Create the estudio periodontal
    const { data, error } = await supabase
      .from('estudios_periodontales')
      .insert({
        paciente_id,
        version: nextVersion,
        doctor_id: doctor_id || null,
        atendido_por: body.atendido_por || null,
        fecha_estudio,
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
