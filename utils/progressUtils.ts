// Progress calculation utilities for orthodontic treatment

export interface ProgressData {
  completedAppointments: number;
  totalEstimatedAppointments: number;
  progressPercentage: number;
  estimatedDuration: number; // in months
  elapsedMonths: number;
  status: string;
  color: string;
}

/**
 * Calculate progress based on appointments completed vs estimated
 * If duracionTratamiento is provided, it takes precedence for total estimated appointments
 */
export function calculateProgress(
  completedAppointments: number,
  totalEstimatedAppointments: number,
  duracionTratamiento?: string
): ProgressData {
  // Extract months from duration string (e.g., "12 meses" -> 12)
  // This becomes the total estimated appointments (1 appointment per month)
  const estimatedDuration = extractMonthsFromDuration(duracionTratamiento || '12 meses');
  
  // Use duration-based total if provided, otherwise use the passed total
  // This ensures progress is always based on the treatment duration
  const effectiveTotal = duracionTratamiento ? estimatedDuration : totalEstimatedAppointments;
  
  const progressPercentage = effectiveTotal > 0 
    ? Math.min(Math.round((completedAppointments / effectiveTotal) * 100), 100)
    : 0;

  const elapsedMonths = 0; // This will be calculated from fecha_inicio_tratamiento
  
  return {
    completedAppointments,
    totalEstimatedAppointments: effectiveTotal,
    progressPercentage,
    estimatedDuration,
    elapsedMonths,
    status: getProgressStatus(progressPercentage),
    color: getProgressColor(progressPercentage)
  };
}

/**
 * Extract numeric months from duration string
 */
export function extractMonthsFromDuration(duracion: string): number {
  const match = duracion.match(/\d+/);
  return match ? parseInt(match[0]) : 12;
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage < 25) return 'bg-red-500 dark:bg-red-600';
  if (percentage < 50) return 'bg-orange-500 dark:bg-orange-600';
  if (percentage < 75) return 'bg-yellow-500 dark:bg-yellow-600';
  if (percentage < 100) return 'bg-blue-500 dark:bg-blue-600';
  return 'bg-green-500 dark:bg-green-600';
}

/**
 * Get progress status text
 */
export function getProgressStatus(percentage: number): string {
  if (percentage === 0) return 'No iniciado';
  if (percentage < 25) return 'Inicio del tratamiento';
  if (percentage < 50) return 'Progreso inicial';
  if (percentage < 75) return 'Progreso intermedio';
  if (percentage < 100) return 'Progreso avanzado';
  return 'Tratamiento completado';
}

/**
 * Update progress based on new appointment
 */
export function updateProgressWithAppointment(
  currentProgress: ProgressData,
  incrementAppointments: boolean = true
): ProgressData {
  const newCompletedAppointments = incrementAppointments 
    ? currentProgress.completedAppointments + 1
    : currentProgress.completedAppointments;
  
  return calculateProgress(newCompletedAppointments, currentProgress.totalEstimatedAppointments);
}

/**
 * Calculate estimated appointments from treatment duration
 */
export function calculateEstimatedAppointments(duracionTratamiento: string): number {
  const months = extractMonthsFromDuration(duracionTratamiento);
  // Rule of thumb: 1 appointment per month for orthodontic treatment
  // Minimum 4 appointments for very short treatments
  return Math.max(months, 4);
}

/**
 * Calculate estimated completion date
 */
export function estimateCompletionDate(
  startDate: Date,
  totalMonths: number,
  currentProgress: number
): Date {
  const completionDate = new Date(startDate);
  const remainingMonths = Math.ceil(totalMonths * (1 - currentProgress / 100));
  completionDate.setMonth(completionDate.getMonth() + remainingMonths);
  
  return completionDate;
}
