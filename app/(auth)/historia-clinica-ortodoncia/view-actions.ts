'use server';

import { OrthodonticHistoryService } from '@/services/orthodonticHistoryService';
import { redirect } from 'next/navigation';

export async function viewOrthodonticHistory(formData: FormData) {
  'use server';
  
  const patientId = formData.get('paciente_id') as string;
  
  if (!patientId) {
    throw new Error('ID de paciente es requerido para ver la historia clínica ortodóncica');
  }

  try {
    const history = await OrthodonticHistoryService.getOrthodonticHistory(patientId);
    
    if (!history) {
      throw new Error('No se encontró historia clínica ortodóncica para este paciente');
    }

    // Redirect to edit page with patient ID
    redirect(`/historia-clinica-ortodoncia?id=${patientId}&edit=true`);
    
  } catch (error) {
    console.error('Error viewing orthodontic history:', error);
    throw new Error(`Error al ver historia clínica ortodóncica: ${error.message}`);
  }
}
