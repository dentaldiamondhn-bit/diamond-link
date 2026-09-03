'use client';

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/chat/hooks/useInstallPrompt';
import { useTranslations } from '@/chat/i18n/useTranslations';

/**
 * PWA install affordance for the chat header.
 *
 * - Desktop/Android: captures `beforeinstallprompt` and opens the browser's
 *   native install dialog on click.
 * - iOS Safari: no `beforeinstallprompt` exists, so tapping toggles a small
 *   hint telling the user to use Share → Add to Home Screen.
 * - Hidden entirely once the app is running installed (standalone display mode).
 */
export const InstallAppButton = () => {
  const { t } = useTranslations();
  const { canInstall, installed, isIos, promptInstall } = useInstallPrompt();
  const [iosHint, setIosHint] = useState(false);

  // Hiding until the installed state has been read avoids a flash of the button.
  if (installed) return null;

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
      return;
    }
    if (isIos) {
      setIosHint((v) => !v);
    }
  };

  return (
    <div className="relative">
      {(canInstall || isIos) && (
        <button
          type="button"
          onClick={handleClick}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          title={t('installApp')}
          aria-label={t('installApp')}
        >
          <Download className="h-5 w-5" />
        </button>
      )}

      {iosHint && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIosHint(false)} />
          <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-700 dark:text-gray-200">{t('installHint')}</p>
              <button
                type="button"
                onClick={() => setIosHint(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label={t('installDismiss')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InstallAppButton;
