'use server';

import { updateOrthodonticHistory } from './actions';
import { redirect } from 'next/navigation';

export async function updateOrthodonticHistoryAction(formData: FormData) {
  'use server';
  
  const patientId = formData.get('paciente_id') as string;
  const recordId = formData.get('orthodontic_history_id') as string;
  const doctorId = formData.get('doctor_id') as string;
  const otroDoctorValue = formData.get('otro_doctor') as string;
  const finalDoctorId = doctorId === 'otro' ? otroDoctorValue : doctorId;
  
  // Extract all form data
  const submitData = {
    paciente_id: patientId,
    doctor_id: finalDoctorId,
    nombre_completo: formData.get('nombre_completo') as string,
    edad: formData.get('edad') ? parseInt(formData.get('edad') as string) : undefined,
    fecha_nacimiento: formData.get('fecha_nacimiento') as string,
    sexo: formData.get('sexo') as string,
    motivo_consulta_ortodoncia: formData.get('motivo_consulta_ortodoncia') as string,
    diagnostico_ortodoncia: formData.get('diagnostico_ortodoncia') as string,
    plan_tratamiento_ortodoncia: formData.get('plan_tratamiento_ortodoncia') as string,
    tipo_mordida: formData.get('tipo_mordida') as string,
    tipo_aparato: formData.get('tipo_aparato') as string,
    duracion_tratamiento: formData.get('duracion_tratamiento') as string,
    fecha_inicio_tratamiento: formData.get('fecha_inicio_tratamiento') as string,
    fecha_fin_tratamiento: formData.get('fecha_fin_tratamiento') as string,
    observaciones_ortodoncia: formData.get('observaciones_ortodoncia') as string,
    radiografias_realizadas: formData.get('radiografias_realizadas') as string,
    modelos_estudio: formData.get('modelos_estudio') as string,
    analisis_cefalometrico: formData.get('analisis_cefalometrico') as string,
    extracciones_realizadas: formData.get('extracciones_realizadas') as string,
    retenedor_tipo: formData.get('retenedor_tipo') as string,
    retenedor_uso: formData.get('retenedor_uso') as string,
    seguimiento_post_tratamiento: formData.get('seguimiento_post_tratamiento') as string,
    documentos_ortodoncia: null, // Will be handled separately
    firma_digital_ortodoncia: formData.get('firma_digital_ortodoncia') as string,
  };

  try {
    await updateOrthodonticHistory(recordId, submitData);
    redirect(`/historia-clinica-ortodoncia?id=${patientId}&edit=true`);
  } catch (error) {
    console.error('Error updating orthodontic history:', error);
    throw new Error(`Error al actualizar historia clínica ortodóncica: ${error.message}`);
  }
}
