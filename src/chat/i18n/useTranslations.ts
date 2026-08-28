'use client';

import { useMemo } from 'react';
import { useGlobalPreferences } from '@/hooks/useUserPreferences';
import {
  ChatLocale,
  TranslationKey,
  getChatLocale,
  interpolate,
  translations,
} from './translations';

/**
 * Sealed chat i18n hook. Components read strings via `t(key, params)`.
 * Locale resolves from the user's global preferences (persisted), falling back
 * to Spanish to match the existing app UX.
 */
export function useTranslations() {
  const { preferences } = useGlobalPreferences();

  const locale: ChatLocale = useMemo(
    () =>
      getChatLocale(
        preferences?.locale ?? preferences?.language ?? localStorage.getItem('chat-locale')
      ),
    [preferences]
  );

  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    interpolate(translations[locale][key], params);

  return { t, locale };
}