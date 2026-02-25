// Version management utilities for orthodontic history

export interface OrthodonticVersion {
  id: string;
  patientId: string;
  versionNumber: number;
  createdAt: string;
  recordDate?: string;
  progressPercentage: number;
  isCurrent: boolean;
  notes?: string;
  createdBy: string;
  
  // All orthodontic fields
  motivoConsultaOrtodoncia?: string;
  diagnosticoOrtodoncia?: string;
  planTratamientoOrtodoncia?: string;
  tipoMordida?: string;
  tipoAparato?: string;
  duracionTratamiento?: string;
  fechaInicioTratamiento?: string;
  fechaFinTratamiento?: string;
  observacionesOrtodoncia?: string;
  radiografiasRealizadas?: string;
  modelosEstudio?: string;
  analisisCefalometrico?: string;
  extraccionesRealizadas?: string;
  retenedorTipo?: string;
  retenedorUso?: string;
  seguimientoPostTratamiento?: string;
  documentosOrtodoncia?: string[];
  firmaDigitalOrtodoncia?: string;
  completedAppointments?: number;
  totalEstimatedAppointments?: number;
}

/**
 * Sort versions by creation date (newest first)
 */
export function sortVersionsByDate(versions: OrthodonticVersion[]): OrthodonticVersion[] {
  return [...versions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get current version from list
 */
export function getCurrentVersion(versions: OrthodonticVersion[]): OrthodonticVersion | null {
  return versions.find(v => v.isCurrent) || null;
}

/**
 * Get next version number
 */
export function getNextVersionNumber(versions: OrthodonticVersion[]): number {
  if (versions.length === 0) return 1;
  
  const maxVersion = Math.max(...versions.map(v => v.versionNumber));
  return maxVersion + 1;
}

/**
 * Format version display text
 */
export function formatVersionDisplay(version: OrthodonticVersion): string {
  const date = version.recordDate 
    ? new Date(version.recordDate).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : new Date(version.createdAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
  
  return `Versión ${version.versionNumber} - ${date}`;
}

/**
 * Check if date is valid for historical record (not in future)
 */
export function isValidHistoricalDate(date: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  return date <= today;
}

/**
 * Get version change summary
 */
export function getVersionChanges(
  currentVersion: OrthodonticVersion,
  previousVersion: OrthodonticVersion
): string[] {
  const changes: string[] = [];
  
  const fieldsToCompare: (keyof OrthodonticVersion)[] = [
    'motivoConsultaOrtodoncia',
    'diagnosticoOrtodoncia',
    'planTratamientoOrtodoncia',
    'tipoMordida',
    'tipoAparato',
    'duracionTratamiento',
    'observacionesOrtodoncia'
  ];
  
  fieldsToCompare.forEach(field => {
    const currentValue = currentVersion[field];
    const previousValue = previousVersion[field];
    
    if (currentValue !== previousValue) {
      const fieldName = getFieldDisplayName(field);
      changes.push(`${fieldName}: ${previousValue || 'vacío'} → ${currentValue || 'vacío'}`);
    }
  });
  
  return changes;
}

/**
 * Get human-readable field name
 */
function getFieldDisplayName(field: keyof OrthodonticVersion): string {
  const fieldNames: Record<string, string> = {
    motivoConsultaOrtodoncia: 'Motivo de consulta',
    diagnosticoOrtodoncia: 'Diagnóstico',
    planTratamientoOrtodoncia: 'Plan de tratamiento',
    tipoMordida: 'Tipo de mordida',
    tipoAparato: 'Tipo de aparato',
    duracionTratamiento: 'Duración del tratamiento',
    observacionesOrtodoncia: 'Observaciones'
  };
  
  return fieldNames[field] || field;
}

/**
 * Generate version notes based on changes
 */
export function generateVersionNotes(
  changes: string[],
  isHistorical: boolean,
  recordDate?: string
): string {
  if (changes.length === 0) {
    return isHistorical 
      ? `Registro histórico transcrito del ${recordDate}`
      : 'Actualización sin cambios';
  }
  
  const changesText = changes.join(', ');
  return isHistorical
    ? `Registro histórico (${recordDate}): ${changesText}`
    : `Cambios: ${changesText}`;
}
