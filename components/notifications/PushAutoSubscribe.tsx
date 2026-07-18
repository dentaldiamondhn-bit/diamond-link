'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export function PushAutoSubscribe() {
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    const run = async () => {
      try {
        const { default: svc } = await import('@/services/pushNotificationService');
        if (cancelled) return;

        await svc.initialize();

        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;

        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) return;

        await svc.subscribe();
      } catch {
        // Silently handle — server-side logging in API routes
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return null;
}
