/**
 * Patient form draft persistence.
 *
 * Mirrors `src/calendario/event/eventDraft.ts` (C20 draft mechanism) so a page
 * refresh — accidental or forced for device performance — never wipes a
 * partially filled "Nueva Historia Clínica" form.
 *
 * Scope: CREATE mode only (no `?id=` param), matching the event modal's
 * create-only drafts. Edit mode reloads its base data from Supabase, so there is
 * nothing to protect against refresh. Key: `patient-draft:create` for new
 * patients (the event draft is keyed per-date; the patient form has no date, so
 * a single create key is sufficient).
 *
 * Values are collected from the live DOM (`form.elements`) at save time — the
 * form mixes fully-controlled, semi-controlled and uncontrolled fields, and the
 * DOM always reflects the current value, so it is the single reliable source of
 * truth. Drafts expire after 24 hours.
 */
export interface PatientDraftState {
  /** Form field name -> value (captured from `form.elements` + country selects). */
  values: Record<string, string>;
  savedAt: number;
}

const KEY_PREFIX = 'patient-draft:';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function patientDraftKey(patientId?: string | null): string {
  return `${KEY_PREFIX}${patientId ? patientId : 'create'}`;
}

export function savePatientDraft(key: string, values: Record<string, string>) {
  try {
    const state: PatientDraftState = { values, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // quota / private-browsing — drafts are best-effort
  }
}

export function loadPatientDraft(key: string): PatientDraftState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const state = JSON.parse(raw) as PatientDraftState;
    if (!state || typeof state.savedAt !== 'number' || !state.values) return null;
    if (Date.now() - state.savedAt > TTL_MS) {
      localStorage.removeItem(key); // expired — discard
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearPatientDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}