/**
 * Pure helpers for the doctor and date-range filters on the tratamientos-completados list.
 *
 * A treatment carries two different doctors: `paciente.doctor` (the patient's
 * assigned doctor, shown in the Doctor column) and
 * `tratamientos_realizados[].doctor_name` (the doctor who actually performed
 * each treatment line, shown as "Tratado por"). The filter matches either one.
 *
 * Kept dependency-free so the filtering rules can be unit-tested without
 * importing the React page or the Supabase service.
 */

export interface FilterableTreatment {
  paciente?: { doctor?: string | null } | null;
  tratamientos_realizados?: Array<{ doctor_name?: string | null }> | null;
}

export interface TreatmentDoctorRef {
  /** Normalized name used for matching. */
  key: string;
  /** Name as it should be shown in the dropdown. */
  label: string;
}

export interface DoctorFilterOption {
  value: string;
  label: string;
  count: number;
}

/** Placeholder the page renders when a treatment has no doctor; never a real doctor. */
const IGNORED_DOCTOR_NAMES = new Set(['no especificado']);

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize a doctor name so the same person matches regardless of casing or
 * spacing. Returns an empty string when the name carries no information.
 */
export function normalizeDoctorName(name?: string | null): string {
  if (!name) return '';
  return collapseWhitespace(String(name)).toLowerCase();
}

/**
 * Collect every distinct doctor attached to a treatment: the assigned doctor
 * first, then each treating doctor in order.
 */
export function collectTreatmentDoctors(treatment: FilterableTreatment): TreatmentDoctorRef[] {
  const refs: TreatmentDoctorRef[] = [];
  const seen = new Set<string>();

  const push = (raw?: string | null) => {
    if (!raw) return;
    const label = collapseWhitespace(String(raw));
    if (!label) return;
    const key = normalizeDoctorName(label);
    if (!key || IGNORED_DOCTOR_NAMES.has(key)) return;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ key, label });
  };

  push(treatment.paciente?.doctor);
  for (const item of treatment.tratamientos_realizados || []) {
    push(item?.doctor_name);
  }

  return refs;
}

/**
 * Build the dropdown options from the doctors attached to the given
 * treatments. Each treatment counts once per distinct doctor, and the most
 * common spelling of a name becomes the option label.
 */
export function buildDoctorOptions(doctorLists: TreatmentDoctorRef[][]): DoctorFilterOption[] {
  const totals = new Map<string, number>();
  const spellings = new Map<string, Map<string, number>>();

  for (const refs of doctorLists) {
    for (const ref of refs) {
      if (!totals.has(ref.key)) {
        totals.set(ref.key, 0);
        spellings.set(ref.key, new Map());
      }
      totals.set(ref.key, (totals.get(ref.key) as number) + 1);
      const variants = spellings.get(ref.key) as Map<string, number>;
      variants.set(ref.label, (variants.get(ref.label) || 0) + 1);
    }
  }

  const options: DoctorFilterOption[] = [];
  for (const [value, count] of totals) {
    const variants = spellings.get(value) as Map<string, number>;
    let bestLabel = '';
    let bestCount = -1;
    for (const [label, variantCount] of variants) {
      if (variantCount > bestCount) {
        bestLabel = label;
        bestCount = variantCount;
      }
    }
    options.push({ value, label: bestLabel, count });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/** True when the treatment matches the selected doctor. No selection keeps everything. */
export function matchesDoctorFilter(refs: TreatmentDoctorRef[], selectedValue: string): boolean {
  if (!selectedValue) return true;
  return refs.some(ref => ref.key === selectedValue);
}

/**
 * True when the clinic-local date (YYYY-MM-DD) falls inside the range.
 * An empty bound means unbounded; a treatment without a date cannot fall
 * inside a bounded range.
 */
export function matchesDateRange(localDate: string, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!localDate) return false;
  if (from && localDate < from) return false;
  if (to && localDate > to) return false;
  return true;
}

/** False when the lower bound is after the upper bound. */
export function isValidDateRange(from: string, to: string): boolean {
  if (!from || !to) return true;
  return from <= to;
}
