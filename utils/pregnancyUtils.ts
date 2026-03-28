/**
 * Pregnancy utility functions for calculating pregnancy status and end dates
 */

export interface PregnancyCalculation {
  fechaFin: string;
  semanasRestantes: number;
  estaActivo: boolean;
  semanasTranscurridas: number;
}

/**
 * Calculate pregnancy end date and status based on consultation start date and pregnancy weeks
 * @param fechaInicioConsulta - Date when consultation started (YYYY-MM-DD format)
 * @param semanasEmbarazo - Current pregnancy weeks at consultation time
 * @returns Pregnancy calculation object
 */
export function calculatePregnancyStatus(
  fechaInicioConsulta: string,
  semanasEmbarazo: number
): PregnancyCalculation {
  if (!fechaInicioConsulta || !semanasEmbarazo || semanasEmbarazo <= 0) {
    return {
      fechaFin: '',
      semanasRestantes: 0,
      estaActivo: false,
      semanasTranscurridas: 0
    };
  }

  // Calculate total pregnancy duration (40 weeks is standard full term)
  const totalSemanas = 40;
  
  // Calculate how many weeks have passed since consultation
  const fechaConsulta = new Date(fechaInicioConsulta);
  const fechaActual = new Date();
  const diasTranscurridos = Math.floor((fechaActual.getTime() - fechaConsulta.getTime()) / (1000 * 60 * 60 * 24));
  const semanasDesdeConsulta = Math.floor(diasTranscurridos / 7);
  
  // Calculate current pregnancy week
  const semanaActual = semanasEmbarazo + semanasDesdeConsulta;
  
  // Calculate pregnancy end date (40 weeks from conception)
  // We estimate conception was approximately (semanasEmbarazo) weeks before consultation
  const fechaConcepcionEstimada = new Date(fechaConsulta);
  fechaConcepcionEstimada.setDate(fechaConcepcionEstimada.getDate() - (semanasEmbarazo * 7));
  
  const fechaFin = new Date(fechaConcepcionEstimada);
  fechaFin.setDate(fechaFin.getDate() + (totalSemanas * 7));
  
  // Calculate weeks remaining
  const semanasRestantes = Math.max(0, totalSemanas - semanaActual);
  
  // Pregnancy is active if current week is less than 40 and hasn't ended
  const estaActivo = semanaActual < totalSemanas && fechaActual <= fechaFin;
  
  return {
    fechaFin: fechaFin.toISOString().split('T')[0], // Format as YYYY-MM-DD
    semanasRestantes,
    estaActivo,
    semanasTranscurridas: semanaActual
  };
}

/**
 * Update pregnancy status when patient data changes
 * @param patientData - Current patient data
 * @returns Updated patient data with calculated pregnancy fields
 */
export function updatePregnancyStatus(patientData: any): any {
  if (patientData.embarazo !== 'si' || !patientData.fecha_inicio || !patientData.semanas_embarazo) {
    return {
      ...patientData,
      embarazo_activo: false,
      embarazo_fecha_fin: null
    };
  }

  const calculation = calculatePregnancyStatus(
    patientData.fecha_inicio,
    patientData.semanas_embarazo
  );

  return {
    ...patientData,
    embarazo_fecha_fin: calculation.fechaFin,
    embarazo_activo: calculation.estaActivo
  };
}

/**
 * Check if patient should still be categorized as pregnant
 * @param patient - Patient object
 * @returns boolean indicating if pregnancy category should apply
 */
export function shouldShowPregnancyCategory(patient: any): boolean {
  return patient.embarazo === 'si' && 
         patient.embarazo_activo === true && 
         patient.sexo === 'femenino';
}
