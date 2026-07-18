'use client';

import React, { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import PushNotificationService from '@/services/pushNotificationService';

export function NotificationListenerWrapper({ children }: { children: React.ReactNode }) {
  useNotificationListener();
  const { isLoaded, isSignedIn } = useUser();
  const attemptRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (attemptRef.current) return;
    attemptRef.current = true;

    const setup = async () => {
      try {
        const svc = PushNotificationService;
        await svc.initialize();

        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) return;
        await svc.subscribe();
      } catch {
        // Silently handle - the API routes have server-side logging
      }
    };
    setup();
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
}
