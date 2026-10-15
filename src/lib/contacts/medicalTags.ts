/**
 * Pure helpers for turning free-text patient-form fields into medical tags.
 *
 * Kept free of Dexie/Supabase imports so both the client-side
 * `patientLink.linkContactToPatient` and the server-side
 * `linkContactServer.linkContactToPatient` can share one source of truth.
 */

/** Values that mean "no allergies/conditions/medications" and must not tint UI. */
export const NEGATION_TAGS = new Set([
  'no',
  'n/a',
  'na',
  'none',
  '0',
  '-',
  'no hay',
  'no hay alergias',
  'no presenta',
  'no presenta alergias',
  'no refiere',
  'no refiere alergias',
  'no aplica',
  'no aplicable',
  'ninguna',
  'ninguno',
  'ninguna alergia',
  'sin alergias',
  'sin',
  'desconocido',
  'no conocida',
  'no conocidas',
  'no se conocen',
])

export const normalizeTag = (t: string): string =>
  t.trim().toLowerCase().replace(/[¡!¿?.,]/g, '').replace(/\s+/g, ' ').trim()

export function isMeaningfulMedicalTag(tag: string): boolean {
  const t = normalizeTag(tag)
  return t !== '' && !NEGATION_TAGS.has(t)
}

/** Keep only tags that represent an actual medical item (drops "No", "N/A", "0", …). */
export function meaningfulMedicalTags(tags: string[]): string[] {
  return tags.filter(isMeaningfulMedicalTag)
}

/** Split a free-text patient-form field (newlines, commas, semicolons) into tags. */
export function splitField(s?: string | null): string[] {
  return (s ?? '')
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}
