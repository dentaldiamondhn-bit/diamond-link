import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractMonthsFromDuration } from '@/utils/progressUtils';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function calculateProgressPercentage(completedAppointments: number, totalEstimatedAppointments: number): number {
  if (totalEstimatedAppointments <= 0) return 0;
  return Math.min(Math.round((completedAppointments / totalEstimatedAppointments) * 100), 100);
}

function calculateTotalEstimatedAppointments(duracionTratamiento?: string): number {
  if (!duracionTratamiento) return 12; // default
  return Math.max(extractMonthsFromDuration(duracionTratamiento), 4); // minimum 4 appointments
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }
    
    // Get all versions for patient
    const { data: versions, error } = await supabase
      .from('historia_clinica_ortodoncia_versions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orthodontic versions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch versions', details: error },
        { status: 500 }
      );
    }
    
    // Transform field names to camelCase for frontend
    const transformedVersions = versions?.map(version => ({
      id: version.id,
      patientId: version.patient_id,
      versionNumber: version.version_number,
      createdAt: version.created_at,
      recordDate: version.record_date,
      progressPercentage: version.progress_percentage,
      isCurrent: version.is_current,
      notes: version.notes,
      createdBy: version.created_by,
      pacienteId: version.paciente_id,
      doctorId: version.doctor_id,
      motivoConsultaOrtodoncia: version.motivo_consulta_ortodoncia,
      diagnosticoOrtodoncia: version.diagnostico_ortodoncia,
      planTratamientoOrtodoncia: version.plan_tratamiento_ortodoncia,
      tipoMordida: version.tipo_mordida,
      tipoAparato: version.tipo_aparato,
      duracionTratamiento: version.duracion_tratamiento,
      fechaInicioTratamiento: version.fecha_inicio_tratamiento,
      fechaFinTratamiento: version.fecha_fin_tratamiento,
      observacionesOrtodoncia: version.observaciones_ortodoncia,
      radiografiasRealizadas: version.radiografias_realizadas,
      modelosEstudio: version.modelos_estudio,
      analisisCefalometrico: version.analisis_cefalometrico,
      extraccionesRealizadas: version.extracciones_realizadas,
      retenedorTipo: version.retenedor_tipo,
      retenedorUso: version.retenedor_uso,
      retenedorInferiorTipo: version.retenedor_inferior_tipo,
      retenedorInferiorUso: version.retenedor_inferior_uso,
      seguimientoPostTratamiento: version.seguimiento_post_tratamiento,
      documentosOrtodoncia: version.documentos_ortodoncia,
      firmaDigitalOrtodoncia: version.firma_digital_ortodoncia,
      completedAppointments: version.completed_appointments,
      totalEstimatedAppointments: version.total_estimated_appointments
    })) || [];
    
    return NextResponse.json({ versions: transformedVersions });
  } catch (error) {
    console.error('Error in orthodontic versions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      patientId, 
      versionNumber, 
      recordDate, 
      notes, 
      isCurrent = false,
      pacienteId,
      doctorId,
      motivoConsultaOrtodoncia,
      diagnosticoOrtodoncia,
      planTratamientoOrtodoncia,
      tipoMordida,
      tipoAparato,
      duracionTratamiento,
      fechaInicioTratamiento,
      fechaFinTratamiento,
      observacionesOrtodoncia,
      radiografiasRealizadas,
      modelosEstudio,
      analisisCefalometrico,
      extraccionesRealizadas,
      retenedorTipo,
      retenedorUso,
      retenedorInferiorTipo,
      retenedorInferiorUso,
      seguimientoPostTratamiento,
      documentosOrtodoncia,
      firmaDigitalOrtodoncia,
      completedAppointments,
      totalEstimatedAppointments: providedTotalEstimated
    } = body;
    
    if (!patientId || !versionNumber) {
      return NextResponse.json(
        { error: 'Patient ID and version number are required' },
        { status: 400 }
      );
    }
    
    // Calculate progress automatically
    const totalEstimatedAppointments = calculateTotalEstimatedAppointments(duracionTratamiento);
    const calculatedProgressPercentage = calculateProgressPercentage(completedAppointments, totalEstimatedAppointments);
    
    console.log('Creating orthodontic version:', { 
      patientId, 
      versionNumber, 
      isCurrent, 
      completedAppointments: completedAppointments,
      totalEstimatedAppointments,
      calculatedProgressPercentage 
    });
    
    // Only use user-provided notes, no automatic system notes
    const finalNotes = notes || null;
    
    // Build insert object, filtering out undefined values
    // If recordDate is not provided, use today's date
    const finalRecordDate = recordDate || new Date().toISOString().split('T')[0];
    
    const insertData: Record<string, unknown> = {
      patient_id: patientId,
      version_number: versionNumber,
      record_date: finalRecordDate,
      is_current: isCurrent,
      created_by: 'current_user'
    };
    
    // Only add optional fields if they have values
    if (notes) insertData.notes = finalNotes;
    if (pacienteId || patientId) insertData.paciente_id = pacienteId || patientId;
    if (doctorId) insertData.doctor_id = doctorId;
    if (motivoConsultaOrtodoncia) insertData.motivo_consulta_ortodoncia = motivoConsultaOrtodoncia;
    if (diagnosticoOrtodoncia) insertData.diagnostico_ortodoncia = diagnosticoOrtodoncia;
    if (planTratamientoOrtodoncia) insertData.plan_tratamiento_ortodoncia = planTratamientoOrtodoncia;
    if (tipoMordida) insertData.tipo_mordida = tipoMordida;
    if (tipoAparato) insertData.tipo_aparato = tipoAparato;
    if (duracionTratamiento) insertData.duracion_tratamiento = duracionTratamiento;
    if (fechaInicioTratamiento !== undefined) {
      insertData.fecha_inicio_tratamiento = fechaInicioTratamiento === '' ? null : fechaInicioTratamiento;
    }
    if (fechaFinTratamiento !== undefined) {
      insertData.fecha_fin_tratamiento = fechaFinTratamiento === '' ? null : fechaFinTratamiento;
    }
    if (observacionesOrtodoncia) insertData.observaciones_ortodoncia = observacionesOrtodoncia;
    if (radiografiasRealizadas) {
      insertData.radiografias_realizadas = Array.isArray(radiografiasRealizadas) ? radiografiasRealizadas : [radiografiasRealizadas];
    }
    if (modelosEstudio) insertData.modelos_estudio = modelosEstudio;
    if (analisisCefalometrico) insertData.analisis_cefalometrico = analisisCefalometrico;
    if (extraccionesRealizadas) insertData.extracciones_realizadas = extraccionesRealizadas;
    if (retenedorTipo) insertData.retenedor_tipo = retenedorTipo;
    if (retenedorUso) insertData.retenedor_uso = retenedorUso;
    if (retenedorInferiorTipo) insertData.retenedor_inferior_tipo = retenedorInferiorTipo;
    if (retenedorInferiorUso) insertData.retenedor_inferior_uso = retenedorInferiorUso;
    if (seguimientoPostTratamiento) insertData.seguimiento_post_tratamiento = seguimientoPostTratamiento;
    if (documentosOrtodoncia) insertData.documentos_ortodoncia = documentosOrtodoncia;
    if (firmaDigitalOrtodoncia) insertData.firma_digital_ortodoncia = firmaDigitalOrtodoncia;
    if (calculatedProgressPercentage !== undefined) insertData.progress_percentage = calculatedProgressPercentage;
    if (completedAppointments !== undefined) insertData.completed_appointments = completedAppointments;
    if (totalEstimatedAppointments) insertData.total_estimated_appointments = totalEstimatedAppointments;
    
    // Create new version in database
    const { data: version, error } = await supabase
      .from('historia_clinica_ortodoncia_versions')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating orthodontic version:', error);
      console.error('Insert data:', JSON.stringify(insertData, null, 2));
      return NextResponse.json(
        { error: 'Failed to create version', details: error.message, insertData },
        { status: 500 }
      );
    }
    
    // If this is current version, update other versions and main record
    if (isCurrent) {
      // Update other versions to not current
      await supabase
        .from('historia_clinica_ortodoncia_versions')
        .update({ is_current: false })
        .eq('patient_id', patientId)
        .neq('id', version.id);
      
      // Update main record
      await supabase
        .from('historia_clinica_ortodoncia')
        .update({
          current_version: versionNumber,
          progress_percentage: calculatedProgressPercentage,
          completed_appointments: completedAppointments
        })
        .eq('paciente_id', patientId);
    }
    
    return NextResponse.json({ 
      success: true, 
      version: {
        id: version.id,
        patientId: version.patient_id,
        versionNumber: version.version_number,
        createdAt: version.created_at,
        recordDate: version.record_date,
        progressPercentage: version.progress_percentage,
        isCurrent: version.is_current,
        notes: version.notes,
        pacienteId: version.paciente_id,
        doctorId: version.doctor_id,
        motivoConsultaOrtodoncia: version.motivo_consulta_ortodoncia,
        diagnosticoOrtodoncia: version.diagnostico_ortodoncia,
        planTratamientoOrtodoncia: version.plan_tratamiento_ortodoncia,
        tipoMordida: version.tipo_mordida,
        tipoAparato: version.tipo_aparato,
        duracionTratamiento: version.duracion_tratamiento,
        fechaInicioTratamiento: version.fecha_inicio_tratamiento,
        fechaFinTratamiento: version.fecha_fin_tratamiento,
        observacionesOrtodoncia: version.observaciones_ortodoncia,
        radiografiasRealizadas: version.radiografias_realizadas,
        modelosEstudio: version.modelos_estudio,
        analisisCefalometrico: version.analisis_cefalometrico,
        extraccionesRealizadas: version.extracciones_realizadas,
        retenedorTipo: version.retenedor_tipo,
        retenedorUso: version.retenedor_uso,
        retenedorInferiorTipo: version.retenedor_inferior_tipo,
        retenedorInferiorUso: version.retenedor_inferior_uso,
        seguimientoPostTratamiento: version.seguimiento_post_tratamiento,
        documentosOrtodoncia: version.documentos_ortodoncia,
        firmaDigitalOrtodoncia: version.firma_digital_ortodoncia,
        completedAppointments: version.completed_appointments,
        totalEstimatedAppointments: version.total_estimated_appointments
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      patientId, 
      originalVersionId,
      recordDate, 
      notes, 
      isCurrent = false,
      pacienteId,
      doctorId,
      motivoConsultaOrtodoncia,
      diagnosticoOrtodoncia,
      planTratamientoOrtodoncia,
      tipoMordida,
      tipoAparato,
      duracionTratamiento,
      fechaInicioTratamiento,
      fechaFinTratamiento,
      observacionesOrtodoncia,
      radiografiasRealizadas,
      modelosEstudio,
      analisisCefalometrico,
      extraccionesRealizadas,
      retenedorTipo,
      retenedorUso,
      retenedorInferiorTipo,
      retenedorInferiorUso,
      seguimientoPostTratamiento,
      documentosOrtodoncia,
      firmaDigitalOrtodoncia,
      completedAppointments,
      totalEstimatedAppointments: providedTotalEstimated
    } = body;
    
    if (!patientId || !originalVersionId) {
      return NextResponse.json(
        { error: 'Patient ID and version ID are required' },
        { status: 400 }
      );
    }
    
    // Calculate progress automatically
    const totalEstimatedAppointments = calculateTotalEstimatedAppointments(duracionTratamiento);
    const calculatedProgressPercentage = calculateProgressPercentage(completedAppointments, totalEstimatedAppointments);
    
    const finalNotes = notes || null;
    const finalRecordDate = recordDate || new Date().toISOString().split('T')[0];
    
    const updateData: Record<string, unknown> = {
      record_date: finalRecordDate,
      is_current: isCurrent,
    };
    
    if (notes !== undefined) updateData.notes = finalNotes;
    if (pacienteId || patientId) updateData.paciente_id = pacienteId || patientId;
    if (doctorId !== undefined) updateData.doctor_id = doctorId;
    if (motivoConsultaOrtodoncia !== undefined) updateData.motivo_consulta_ortodoncia = motivoConsultaOrtodoncia;
    if (diagnosticoOrtodoncia !== undefined) updateData.diagnostico_ortodoncia = diagnosticoOrtodoncia;
    if (planTratamientoOrtodoncia !== undefined) updateData.plan_tratamiento_ortodoncia = planTratamientoOrtodoncia;
    if (tipoMordida !== undefined) updateData.tipo_mordida = tipoMordida;
    if (tipoAparato !== undefined) updateData.tipo_aparato = tipoAparato;
    if (duracionTratamiento !== undefined) updateData.duracion_tratamiento = duracionTratamiento;
    if (fechaInicioTratamiento !== undefined) {
      updateData.fecha_inicio_tratamiento = fechaInicioTratamiento === '' ? null : fechaInicioTratamiento;
    }
    if (fechaFinTratamiento !== undefined) {
      updateData.fecha_fin_tratamiento = fechaFinTratamiento === '' ? null : fechaFinTratamiento;
    }
    if (observacionesOrtodoncia !== undefined) updateData.observaciones_ortodoncia = observacionesOrtodoncia;
    if (radiografiasRealizadas !== undefined) {
      updateData.radiografias_realizadas = Array.isArray(radiografiasRealizadas) ? radiografiasRealizadas : [radiografiasRealizadas];
    }
    if (modelosEstudio !== undefined) updateData.modelos_estudio = modelosEstudio;
    if (analisisCefalometrico !== undefined) updateData.analisis_cefalometrico = analisisCefalometrico;
    if (extraccionesRealizadas !== undefined) updateData.extracciones_realizadas = extraccionesRealizadas;
    if (retenedorTipo !== undefined) updateData.retenedor_tipo = retenedorTipo;
    if (retenedorUso !== undefined) updateData.retenedor_uso = retenedorUso;
    if (retenedorInferiorTipo !== undefined) updateData.retenedor_inferior_tipo = retenedorInferiorTipo;
    if (retenedorInferiorUso !== undefined) updateData.retenedor_inferior_uso = retenedorInferiorUso;
    if (seguimientoPostTratamiento !== undefined) updateData.seguimiento_post_tratamiento = seguimientoPostTratamiento;
    if (documentosOrtodoncia !== undefined) updateData.documentos_ortodoncia = documentosOrtodoncia;
    if (firmaDigitalOrtodoncia !== undefined) updateData.firma_digital_ortodoncia = firmaDigitalOrtodoncia;
    if (calculatedProgressPercentage !== undefined) updateData.progress_percentage = calculatedProgressPercentage;
    if (completedAppointments !== undefined) updateData.completed_appointments = completedAppointments;
    if (totalEstimatedAppointments !== undefined) updateData.total_estimated_appointments = totalEstimatedAppointments;
    
    const { data: version, error } = await supabase
      .from('historia_clinica_ortodoncia_versions')
      .update(updateData)
      .eq('id', originalVersionId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating orthodontic version:', error);
      return NextResponse.json(
        { error: 'Failed to update version', details: error.message },
        { status: 500 }
      );
    }
    
    if (isCurrent) {
      await supabase
        .from('historia_clinica_ortodoncia')
        .update({
          progress_percentage: calculatedProgressPercentage,
          completed_appointments: completedAppointments
        })
        .eq('paciente_id', patientId);
    }
    
    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('Error in orthodontic versions PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
