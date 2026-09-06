'use client';

import { useEffect } from 'react';
import { useGlobalPreferences } from '@/hooks/useUserPreferences';
import { getChatLocale } from './translations';

/**
 * Syncs `<html lang>` with the chat's resolved locale so screen readers and
 * browsers apply the correct language rules. The app UI is Spanish-first
 * (`es` server default); this component corrects the attribute to the user's
 * preference once loaded, and reacts to cross-tab language changes.
 */
export function DocumentLang() {
  const { preferences } = useGlobalPreferences();

  useEffect(() => {
    const current = () =>
      getChatLocale(
        preferences?.locale ??
          preferences?.language ??
          (typeof window !== 'undefined' ? localStorage.getItem('chat-locale') : null)
      );

    const apply = () => {
      document.documentElement.lang = current();
    };

    apply();
    window.addEventListener('storage', apply);
    return () => window.removeEventListener('storage', apply);
  }, [preferences]);

  return null;
}