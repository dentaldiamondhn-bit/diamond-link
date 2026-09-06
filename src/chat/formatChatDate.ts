import type { ChatLocale } from '@/chat/i18n/translations';

/** Local-time calendar day key (YYYY-MM-DD) used to cluster messages. */
export function getChatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * WhatsApp-style date label for a day key:
 * "Today"/"Yesterday" (translated), otherwise "Month Day" for the current year
 * and "Month Day, Year" otherwise.
 */
export function getChatDateLabel(params: {
  key: string;
  todayKey: string;
  yesterdayKey: string;
  today: string;
  yesterday: string;
  locale: ChatLocale;
}): string {
  const { key, todayKey, yesterdayKey, today, yesterday, locale } = params;
  if (key === todayKey) return today;
  if (key === yesterdayKey) return yesterday;
  const date = new Date(`${key}T12:00:00`);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}