/**
 * Navigation helpers for the tratamientos-completados list.
 *
 * A treatment always belongs to a patient, so the "Crear Nuevo Tratamiento"
 * action only exists once a patient is selected. The helper returns null in
 * that case rather than guessing a patient, which keeps the caller from
 * creating a treatment for whoever happens to be listed first.
 */

export function buildNewTreatmentUrl(pacienteId?: string | null): string | null {
  if (!pacienteId) return null;
  return `/tratamientos-completados/new?paciente_id=${encodeURIComponent(pacienteId)}`;
}
