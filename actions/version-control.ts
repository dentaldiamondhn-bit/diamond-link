'use server';

import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';
import { createClient } from '@/lib/supabase/server';
import { OrthodonticVersion } from '@/utils/versionUtils';
import { normalizeRadiografias } from '@/utils/versionUtils';
import { extractMonthsFromDuration } from '@/utils/progressUtils';

export interface CreateNewVersionInput {
  patientId: string;
  parentVersionId?: string | null;
  recordDate?: string;
  notes?: string;
  /** Defaults to false, matching the "Nueva Versión" flow: the new row is the
   *  highest version_number and therefore editable, but is not flagged as the
   *  "current" record (history trail semantics). */
  isCurrent?: boolean;
  versionData: Partial<OrthodonticVersion>;
}

function calculateTotalEstimatedAppointments(duracionTratamiento?: string): number {
  if (!duracionTratamiento) return 12;
  return Math.max(extractMonthsFromDuration(duracionTratamiento), 4);
}

function calculateProgressPercentage(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.round((completed / total) * 100), 100);
}

/**
 * "Save as New Version" fork: duplicates the current slot data into a brand-new
 * row with version = max(version)+1, parent_id pointing at the source version.
 * The new row is fully editable; historical rows stay read-only (enforced by
 * DB trigger + UI lock).
 */
export async function createNewVersion(input: CreateNewVersionInput): Promise<{ success: boolean; version?: OrthodonticVersion; error?: string }> {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return { success: false, error: 'No autenticado' };
    }

    const { patientId, parentVersionId, recordDate, notes, isCurrent = false, versionData } = input;

    let createdByName: string | null = null;
    let createdByImage: string | null = null;
    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await clerk.users.getUser(authResult.userId);
      createdByName = user?.firstName || user?.lastName || user?.primaryEmailAddress?.emailAddress || null;
      createdByImage = user?.imageUrl || null;
    } catch (err) {
      console.error('Error resolving Clerk user for new version:', err);
    }

    const totalEstimatedAppointments = calculateTotalEstimatedAppointments(versionData.duracionTratamiento);
    const completedAppointments = versionData.completedAppointments ?? 0;
    const progressPercentage = calculateProgressPercentage(completedAppointments, totalEstimatedAppointments);

    const insertData: Record<string, unknown> = {
      patient_id: patientId,
      version_number: 0, // computed below after reading the current max
      is_current: isCurrent,
      record_date: recordDate || new Date().toISOString().split('T')[0],
      user_id: authResult.userId,
      created_by: createdByName,
      created_by_image: createdByImage,
      parent_id: parentVersionId || null,
      notes: notes || null,
      progress_percentage: progressPercentage,
      completed_appointments: completedAppointments,
      total_estimated_appointments: totalEstimatedAppointments,
    };

    const contentMapping: Array<[string, keyof OrthodonticVersion]> = [
      ['paciente_id', 'pacienteId'],
      ['doctor_id', 'doctorId'],
      ['motivo_consulta_ortodoncia', 'motivoConsultaOrtodoncia'],
      ['diagnostico_ortodoncia', 'diagnosticoOrtodoncia'],
      ['plan_tratamiento_ortodoncia', 'planTratamientoOrtodoncia'],
      ['tipo_mordida', 'tipoMordida'],
      ['tipo_aparato', 'tipoAparato'],
      ['duracion_tratamiento', 'duracionTratamiento'],
      ['observaciones_ortodoncia', 'observacionesOrtodoncia'],
      ['modelos_estudio', 'modelosEstudio'],
      ['analisis_cefalometrico', 'analisisCefalometrico'],
      ['extracciones_realizadas', 'extraccionesRealizadas'],
      ['retenedor_tipo', 'retenedorTipo'],
      ['retenedor_uso', 'retenedorUso'],
      ['retenedor_inferior_tipo', 'retenedorInferiorTipo'],
      ['retenedor_inferior_uso', 'retenedorInferiorUso'],
      ['seguimiento_post_tratamiento', 'seguimientoPostTratamiento'],
      ['documentos_ortodoncia', 'documentosOrtodoncia'],
      ['firma_digital_ortodoncia', 'firmaDigitalOrtodoncia'],
    ];

    for (const [column, key] of contentMapping) {
      const value = versionData[key];
      if (value !== undefined) insertData[column] = value;
    }

    if (versionData.fechaInicioTratamiento !== undefined) {
      insertData.fecha_inicio_tratamiento = versionData.fechaInicioTratamiento === '' ? null : versionData.fechaInicioTratamiento;
    }
    if (versionData.fechaFinTratamiento !== undefined) {
      insertData.fecha_fin_tratamiento = versionData.fechaFinTratamiento === '' ? null : versionData.fechaFinTratamiento;
    }
    if (versionData.radiografiasRealizadas !== undefined) {
      insertData.radiografias_realizadas = normalizeRadiografias(versionData.radiografiasRealizadas);
    }

    const supabase = createClient();

    // Compute next version number from the DB (not from a possibly-stale list).
    const { data: maxRow, error: maxError } = await supabase
      .from('historia_clinica_ortodoncia_versions')
      .select('version_number')
      .eq('patient_id', patientId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      console.error('Error fetching max version number:', maxError);
      return { success: false, error: 'No se pudo calcular el número de versión' };
    }

    insertData.version_number = (maxRow?.version_number ?? 0) + 1;

    const { data: version, error: insertError } = await supabase
      .from('historia_clinica_ortodoncia_versions')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new orthodontic version:', insertError);
      console.error('Insert data:', JSON.stringify(insertData, null, 2));
      return { success: false, error: `No se pudo crear la versión: ${insertError.message}` };
    }

    if (isCurrent) {
      await supabase
        .from('historia_clinica_ortodoncia_versions')
        .update({ is_current: false })
        .eq('patient_id', patientId)
        .neq('id', version.id);

      await supabase
        .from('historia_clinica_ortodoncia')
        .update({
          current_version: insertData.version_number,
          progress_percentage: progressPercentage,
          completed_appointments: completedAppointments,
        })
        .eq('paciente_id', patientId);
    }

    return {
      success: true,
      version: {
        id: version.id,
        patientId: version.patient_id,
        versionNumber: version.version_number,
        createdAt: version.created_at,
        progressPercentage: version.progress_percentage,
        isCurrent: version.is_current,
        isLocked: version.is_locked ?? false,
        parentId: version.parent_id ?? null,
        notes: version.notes ?? null,
        createdBy: version.created_by ?? null,
        createdByImage: version.created_by_image ?? null,
        userId: version.user_id ?? null,
      },
    };
  } catch (err) {
    console.error('Error in createNewVersion:', err);
    return { success: false, error: 'Error al crear la nueva versión' };
  }
}