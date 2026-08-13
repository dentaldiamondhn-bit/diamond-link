// Version management utilities for orthodontic history

import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';

export interface OrthodonticVersion {
  id: string;
  patientId: string;
  versionNumber: number;
  createdAt: string;
  recordDate?: string;
  progressPercentage: number;
  isCurrent: boolean;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  parentId?: string | null;
  notes?: string;
  createdBy: string;
  createdByImage?: string;
  userId?: string;
  
  // Patient and doctor reference
  pacienteId?: string;
  doctorId?: string;
  
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
  retenedorInferiorTipo?: string;
  retenedorInferiorUso?: string;
  seguimientoPostTratamiento?: string;
  documentosOrtodoncia?: string[];
  firmaDigitalOrtodoncia?: string;
  completedAppointments?: number;
  totalEstimatedAppointments?: number;
}

/**
 * Full clinical template collected by the "Crear Nueva Versión" dialog,
 * seeded from the previous (selected/latest) version so a future version can
 * be completed entirely inside the modal. Mirrors the camelCase fields the
 * server actions accept as overrides.
 */
export interface NewVersionTemplateData {
  recordDate: Date;
  notes?: string;
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
  retenedorInferiorTipo?: string;
  retenedorInferiorUso?: string;
  seguimientoPostTratamiento?: string;
  documentosOrtodoncia?: string[];
}

/** Empty template used when no previous version exists to seed from. */
export function emptyVersionTemplate(): NewVersionTemplateData {
  return {
    recordDate: new Date(),
    notes: '',
    motivoConsultaOrtodoncia: '',
    diagnosticoOrtodoncia: '',
    planTratamientoOrtodoncia: '',
    tipoMordida: '',
    tipoAparato: '',
    duracionTratamiento: '12 meses',
    fechaInicioTratamiento: '',
    fechaFinTratamiento: '',
    observacionesOrtodoncia: '',
    radiografiasRealizadas: '',
    modelosEstudio: '',
    analisisCefalometrico: '',
    extraccionesRealizadas: '',
    retenedorTipo: '',
    retenedorUso: '',
    retenedorInferiorTipo: '',
    retenedorInferiorUso: '',
    seguimientoPostTratamiento: '',
    documentosOrtodoncia: [] as string[],
  };
}

/**
 * Seed a new-version template from a previous version (all clinical fields
 * are copied so the modal can be completed/amended in one place).
 */
export function seedVersionTemplate(
  previous: OrthodonticVersion | null | undefined
): NewVersionTemplateData {
  const base = emptyVersionTemplate();
  if (!previous) return base;
  const radiografias = previous.radiografiasRealizadas
    ? normalizeRadiografias(previous.radiografiasRealizadas)
    : '';
  const recordDate = previous.recordDate
    ? (() => {
        const d = new Date(previous.recordDate + 'T00:00:00');
        return isNaN(d.getTime()) ? new Date() : d;
      })()
    : new Date();
  return {
    ...base,
    recordDate,
    notes: previous.notes || '',
    motivoConsultaOrtodoncia: previous.motivoConsultaOrtodoncia || '',
    diagnosticoOrtodoncia: previous.diagnosticoOrtodoncia || '',
    planTratamientoOrtodoncia: previous.planTratamientoOrtodoncia || '',
    tipoMordida: previous.tipoMordida || '',
    tipoAparato: previous.tipoAparato || '',
    duracionTratamiento: previous.duracionTratamiento || '12 meses',
    fechaInicioTratamiento: previous.fechaInicioTratamiento || '',
    fechaFinTratamiento: previous.fechaFinTratamiento || '',
    observacionesOrtodoncia: previous.observacionesOrtodoncia || '',
    radiografiasRealizadas: radiografias,
    modelosEstudio: previous.modelosEstudio || '',
    analisisCefalometrico: previous.analisisCefalometrico || '',
    extraccionesRealizadas: previous.extraccionesRealizadas || '',
    retenedorTipo: previous.retenedorTipo || '',
    retenedorUso: previous.retenedorUso || '',
    retenedorInferiorTipo: previous.retenedorInferiorTipo || '',
    retenedorInferiorUso: previous.retenedorInferiorUso || '',
    seguimientoPostTratamiento: previous.seguimientoPostTratamiento || '',
    documentosOrtodoncia: previous.documentosOrtodoncia
      ? [...previous.documentosOrtodoncia]
      : [],
  };
}

/**
 * Sort versions by version number (highest first - newest version on top)
 */
export function sortVersionsByDate(versions: OrthodonticVersion[]): OrthodonticVersion[] {
  return [...versions].sort((a, b) => {
    // Sort by version number (highest first)
    return b.versionNumber - a.versionNumber;
  });
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
 * A version is read-only (locked) when:
 *  - it is explicitly hard-locked (isLocked), or
 *  - it is NOT the highest version number for its patient (historical version).
 * Matches both the UI lock ("Actual" = max version number) and the DB trigger.
 */
export function isVersionLocked(
  version: OrthodonticVersion | null,
  versions: OrthodonticVersion[]
): boolean {
  if (!version) return false;
  if (version.isLocked) return true;
  const maxVersionNumber = versions.reduce(
    (max, v) => Math.max(max, v.versionNumber),
    0
  );
  return version.versionNumber < maxVersionNumber;
}

/**
 * Format version display text
 */
export function formatVersionDisplay(version: OrthodonticVersion): string {
  const dateSource = version.recordDate || version.createdAt;
  const date = SimpleTimezoneFix.formatDisplayDate(dateSource);
  
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
 * Normalize radiografias values that may have accumulated JSON-stringify layers
 * or array wrappers during saves. Returns a clean comma-joined string
 * (e.g. "panoramica, lateral_craneo").
 */
export function normalizeRadiografias(value: unknown): string {
  const tokens: string[] = [];

  const pushToken = (raw: string): void => {
    const cleaned = raw.replace(/^["'{]+|["'}]+$/g, '').trim();
    if (cleaned) tokens.push(cleaned);
  };

  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item !== 'string') return;

    let current: string = item.trim();
    if (!current) return;

    // Peel off accumulated JSON-stringify layers
    for (let i = 0; i < 10; i++) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(current);
      } catch {
        break;
      }
      if (Array.isArray(parsed)) {
        visit(parsed);
        return;
      }
      if (typeof parsed === 'string') {
        current = parsed;
        continue;
      }
      break;
    }

    current.split(',').forEach((part) => pushToken(part));
  };

  visit(value);
  return tokens.join(', ');
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
    'observacionesOrtodoncia',
    'retenedorTipo',
    'retenedorUso',
    'retenedorInferiorTipo',
    'retenedorInferiorUso'
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
    observacionesOrtodoncia: 'Observaciones',
    retenedorTipo: 'Tipo de retenedor superior',
    retenedorUso: 'Uso de retenedor superior',
    retenedorInferiorTipo: 'Tipo de retenedor inferior',
    retenedorInferiorUso: 'Uso de retenedor inferior'
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
