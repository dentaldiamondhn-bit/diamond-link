import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractMonthsFromDuration } from '@/utils/progressUtils';

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
    
    // Create new version in database
    const { data: version, error } = await supabase
      .from('historia_clinica_ortodoncia_versions')
      .insert({
        patient_id: patientId,
        version_number: versionNumber,
        record_date: recordDate,
        notes: finalNotes,
        is_current: isCurrent,
        created_by: 'current_user', // TODO: Get from auth
        motivo_consulta_ortodoncia: motivoConsultaOrtodoncia,
        diagnostico_ortodoncia: diagnosticoOrtodoncia,
        plan_tratamiento_ortodoncia: planTratamientoOrtodoncia,
        tipo_mordida: tipoMordida,
        tipo_aparato: tipoAparato,
        duracion_tratamiento: duracionTratamiento,
        fecha_inicio_tratamiento: fechaInicioTratamiento,
        fecha_fin_tratamiento: fechaFinTratamiento,
        observaciones_ortodoncia: observacionesOrtodoncia,
        radiografias_realizadas: radiografiasRealizadas,
        modelos_estudio: modelosEstudio,
        analisis_cefalometrico: analisisCefalometrico,
        extracciones_realizadas: extraccionesRealizadas,
        retenedor_tipo: retenedorTipo,
        retenedor_uso: retenedorUso,
        seguimiento_post_tratamiento: seguimientoPostTratamiento,
        documentos_ortodoncia: documentosOrtodoncia,
        firma_digital_ortodoncia: firmaDigitalOrtodoncia,
        progress_percentage: calculatedProgressPercentage,
        completed_appointments: completedAppointments,
        total_estimated_appointments: totalEstimatedAppointments
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating orthodontic version:', error);
      return NextResponse.json(
        { error: 'Failed to create version', details: error },
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
        seguimientoPostTratamiento: version.seguimiento_post_tratamiento,
        documentosOrtodoncia: version.documentos_ortodoncia,
        firmaDigitalOrtodoncia: version.firma_digital_ortodoncia,
        completedAppointments: version.completed_appointments,
        totalEstimatedAppointments: version.total_estimated_appointments
      }
    });
  } catch (error) {
    console.error('Error in orthodontic versions POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
