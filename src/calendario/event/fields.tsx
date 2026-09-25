'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

const base =
  'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ' +
  'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 ' +
  'focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ' +
  'dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';

const inputCls = (invalid?: boolean) => `${base} ${invalid ? 'border-rose-300 dark:border-rose-700' : ''}`;

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="text-xs text-rose-500 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ invalid, className, ...props }, ref) => (
  <input ref={ref} className={`${inputCls(invalid)} ${className ?? ''}`} {...props} />
));
TextInput.displayName = 'TextInput';

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ invalid, className, ...props }, ref) => (
  <textarea ref={ref} className={`${inputCls(invalid)} resize-none ${className ?? ''}`} {...props} />
));
TextArea.displayName = 'TextArea';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ invalid, className, children, ...props }, ref) => (
  <select ref={ref} className={`${inputCls(invalid)} ${className ?? ''}`} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

const CLINIC_OPEN_MIN = 7 * 60; // 07:00
const CLINIC_CLOSE_MIN = 19 * 60; // 19:00
const SLOT_STEP_MIN = 15; // 15-min blocks — typical dental cadence

/** `17:45` → `17:45 p. m.` — es-HN 12h display with a 2-digit padded hour. */
function slotLabel(h24: number, mm: string): string {
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 >= 12 ? 'p. m.' : 'a. m.';
  return `${String(h).padStart(2, '0')}:${mm} ${suffix}`;
}

/**
 * Preset clinic time slots (`07:00` → `19:00`, 15-min cadence). Each option
 * carries the `HH:mm` value expected by the form schema + DB with an es-HN
 * `HH:mm a. m./p. m.` label — a single dropdown replaces the old
 * Hour/Minute/Period triple picker, cutting the interaction from 3 clicks to 1.
 */
export const TIME_SLOTS: Array<{ value: string; label: string }> = (() => {
  const slots: Array<{ value: string; label: string }> = [];
  for (let mins = CLINIC_OPEN_MIN; mins <= CLINIC_CLOSE_MIN; mins += SLOT_STEP_MIN) {
    const h24 = Math.floor(mins / 60);
    const mm = String(mins % 60).padStart(2, '0');
    slots.push({ value: `${String(h24).padStart(2, '0')}:${mm}`, label: slotLabel(h24, mm) });
  }
  return slots;
})();

/**
 * Single-dropdown time slot picker (clinic cadence). Emits 24h `HH:MM` so the
 * form schema and DB keep 24h values.
 *
 * When `minTime` is given (used for `Fin`), earlier slots are filtered out so
 * the end time can never precede the start — but the current value is always
 * kept as an option, so an off-grid/out-of-range stored time never renders as
 * a blank dropdown.
 */
export function TimeSlotSelect({
  value,
  onChange,
  invalid,
  minTime,
  id,
  'aria-label': ariaLabel,
}: {
  value?: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  /** Only offer slots at-or-after this `HH:mm` (end-time filter). */
  minTime?: string;
  id?: string;
  'aria-label'?: string;
}) {
  const normalized = normalizeSlot(value);
  const filtered = minTime
    ? TIME_SLOTS.filter((s) => s.value >= minTime)
    : TIME_SLOTS;
  const hasCurrent = filtered.some((s) => s.value === normalized);
  const current = hasCurrent
    ? []
    : (() => {
        const h24 = Number(normalized.slice(0, 2));
        const mm = normalized.slice(3, 5);
        return [{ value: normalized, label: slotLabel(h24, mm) }];
      })();
  const options = [...filtered, ...current].sort((a, b) => a.value.localeCompare(b.value));

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={normalized}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls(invalid)}
    >
      {options.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/** Coerce `HH:mm`/`HH:mm:ss` to a valid `HH:mm`; falls back to 07:00. */
function normalizeSlot(time?: string | null): string {
  const [h, m] = (time ?? '').split(':');
  const hh = Number(h);
  const mm = (m || '').slice(0, 2);
  if (/^\d{1,2}$/.test(String(h)) && hh >= 0 && hh <= 23 && /^\d{2}$/.test(mm) && Number(mm) <= 59) {
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }
  return '07:00';
}