'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallPromptState {
  /** True while the browser can show an install prompt (beforeinstallprompt fired). */
  canInstall: boolean;
  /** True once the app is running as a standalone/installed PWA. */
  installed: boolean;
  /** True on iOS Safari, which has no beforeinstallprompt (show a hint instead). */
  isIos: boolean;
  /** Prompt the browser's native install dialog. Returns true if the user accepted. */
  promptInstall: () => Promise<boolean>;
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)');
  if (media.matches) return true;
  // iOS Safari installed check (@ts-expect-error: not in TS lib defs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyNav = window.navigator as any;
  return (
    anyNav?.standalone === true ||
    // TWA / Android custom tabs expose the standalone scope via a service worker
    Boolean(
      typeof localStorage !== 'undefined' &&
        localStorage.getItem('_dl_installed')
    )
  );
}

function detectIos(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) &&
    // The web app is already running on iOS when the ua contains "CriOS/|FxiOS|OPiOS"
    // anyway, but a non-standalone mode that doesn't support prompt is iOS Safari.
    !/CriOS|FxiOS|OPiOS/.test(ua) &&
    !(window as unknown as { MSStream?: boolean }).MSStream
  );
}

export function useInstallPrompt(): InstallPromptState {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState<boolean>(() => detectInstalled());
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  const isIos = detectIos();

  // Listen for installed-state changes incl. swaps across browser tabs.
  useEffect(() => {
    const refresh = () => setInstalled(detectInstalled());
    window.addEventListener('appinstalled', refresh);
    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', refresh);
    return () => {
      window.removeEventListener('appinstalled', refresh);
      media.removeEventListener?.('change', refresh);
    };
  }, []);

  // Capture the browser's install prompt so we can trigger it from a button.
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const evt = deferredPrompt.current;
    if (!evt) return false;
    await evt.prompt();
    const choice = await evt.userChoice;
    deferredPrompt.current = null; // prompt() can only be used once
    setCanInstall(false);
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      try {
        localStorage.setItem('_dl_installed', '1');
      } catch {
        /* ignore quota/private-mode errors */
      }
      return true;
    }
    return false;
  }, []);

  return {
    canInstall,
    installed,
    isIos,
    promptInstall,
  };
}
