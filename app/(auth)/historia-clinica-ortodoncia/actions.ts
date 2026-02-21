'use server';

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';

export async function createOrthodonticHistory(formData: any) {
  
  try {
    // Extract form data
    const {
      paciente_id,
      doctor_id,
      nombre_completo,
      edad,
      fecha_nacimiento,
      sexo,
      motivo_consulta_ortodoncia,
      diagnostico_ortodoncia,
      plan_tratamiento_ortodoncia,
      tipo_mordida,
      tipo_aparato,
      duracion_tratamiento,
      fecha_inicio_tratamiento,
      fecha_fin_tratamiento,
      observaciones_ortodoncia,
      radiografias_realizadas,
      modelos_estudio,
      analisis_cefalometrico,
      extracciones_realizadas,
      retenedor_tipo,
      retenedor_uso,
      seguimiento_post_tratamiento,
      documentos_ortodoncia,
      firma_digital_ortodoncia,
    } = formData;

    // Prepare data for insertion
    const orthodonticData = {
      paciente_id,
      doctor_id: doctor_id, // Use the actual doctor_id from form
      nombre_completo,
      edad: edad ? parseInt(edad) : null,
      fecha_nacimiento,
      sexo,
      motivo_consulta_ortodoncia: motivo_consulta_ortodoncia || null,
      diagnostico_ortodoncia: diagnostico_ortodoncia || null,
      plan_tratamiento_ortodoncia: plan_tratamiento_ortodoncia || null,
      tipo_mordida: tipo_mordida || null,
      tipo_aparato: tipo_aparato || null,
      duracion_tratamiento: duracion_tratamiento || null,
      fecha_inicio_tratamiento: fecha_inicio_tratamiento || null,
      fecha_fin_tratamiento: fecha_fin_tratamiento || null,
      observaciones_ortodoncia: observaciones_ortodoncia || null,
      radiografias_realizadas: radiografias_realizadas || null,
      modelos_estudio: modelos_estudio || null,
      analisis_cefalometrico: analisis_cefalometrico || null,
      extracciones_realizadas: extracciones_realizadas || null,
      retenedor_tipo: retenedor_tipo || null,
      retenedor_uso: retenedor_uso || null,
      seguimiento_post_tratamiento: seguimiento_post_tratamiento || null,
      documentos_ortodoncia: documentos_ortodoncia || null,
      firma_digital_ortodoncia: firma_digital_ortodoncia || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };


    // Insert orthodontic history
    const { data, error } = await supabaseAdmin
      .from('historia_clinica_ortodoncia')
      .insert([orthodonticData])
      .select();

    if (error) {
      console.error('Error inserting orthodontic history:', error);
      throw new Error(`Error al crear historia clínica ortodóncica: ${error.message}`);
    }

    
    return { success: true, data: data[0] };

  } catch (error) {
    console.error('Error in createOrthodonticHistory:', error);
    throw error;
  }
}

export async function updateOrthodonticHistory(recordId: string, formData: any) {
  
  try {
    // Extract form data
    const {
      doctor_id,
      nombre_completo,
      edad,
      fecha_nacimiento,
      sexo,
      motivo_consulta_ortodoncia,
      diagnostico_ortodoncia,
      plan_tratamiento_ortodoncia,
      tipo_mordida,
      tipo_aparato,
      duracion_tratamiento,
      fecha_inicio_tratamiento,
      fecha_fin_tratamiento,
      observaciones_ortodoncia,
      radiografias_realizadas,
      modelos_estudio,
      analisis_cefalometrico,
      extracciones_realizadas,
      retenedor_tipo,
      retenedor_uso,
      seguimiento_post_tratamiento,
      documentos_ortodoncia,
      firma_digital_ortodoncia,
    } = formData;

    // Prepare data for update
    const orthodonticData = {
      doctor_id: doctor_id, // Use the actual doctor_id from form
      nombre_completo,
      edad: edad ? parseInt(edad) : null,
      fecha_nacimiento,
      sexo,
      motivo_consulta_ortodoncia: motivo_consulta_ortodoncia || null,
      diagnostico_ortodoncia: diagnostico_ortodoncia || null,
      plan_tratamiento_ortodoncia: plan_tratamiento_ortodoncia || null,
      tipo_mordida: tipo_mordida || null,
      tipo_aparato: tipo_aparato || null,
      duracion_tratamiento: duracion_tratamiento || null,
      fecha_inicio_tratamiento: fecha_inicio_tratamiento || null,
      fecha_fin_tratamiento: fecha_fin_tratamiento || null,
      observaciones_ortodoncia: observaciones_ortodoncia || null,
      radiografias_realizadas: radiografias_realizadas || null,
      modelos_estudio: modelos_estudio || null,
      analisis_cefalometrico: analisis_cefalometrico || null,
      extracciones_realizadas: extracciones_realizadas || null,
      retenedor_tipo: retenedor_tipo || null,
      retenedor_uso: retenedor_uso || null,
      seguimiento_post_tratamiento: seguimiento_post_tratamiento || null,
      documentos_ortodoncia: documentos_ortodoncia || null,
      firma_digital_ortodoncia: firma_digital_ortodoncia || null,
      updated_at: new Date().toISOString(),
    };


    // Update the record using the record ID
    const { data, error } = await supabaseAdmin
      .from('historia_clinica_ortodoncia')
      .update(orthodonticData)
      .eq('id', recordId)
      .select();


    if (error) {
      console.error('Error updating orthodontic history:', error);
      throw new Error(`Error al actualizar historia clínica ortodóncica: ${error.message}`);
    }

    
    return { success: true, data: data[0] };

  } catch (error) {
    console.error('Error in updateOrthodonticHistory:', error);
    throw error;
  }
}

export async function getOrthodonticHistory(patientId: string) {
  
  try {
    // Get orthodontic history
    const { data, error } = await supabaseAdmin
      .from('historia_clinica_ortodoncia')
      .select('*')
      .eq('paciente_id', patientId)
      .limit(1);


    if (error) {
      console.error('Error getting orthodontic history:', error);
      throw new Error(`Error al obtener historia clínica ortodóncica: ${error.message}`);
    }

    // Return the first record or null if no records found
    const historyData = data && data.length > 0 ? data[0] : null;
    
    return historyData;

  } catch (error) {
    console.error('Error in getOrthodonticHistory:', error);
    throw error;
  }
}
