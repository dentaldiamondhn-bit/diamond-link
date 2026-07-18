'use client';

import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import PushNotificationService from '@/services/pushNotificationService';

export function NotificationListenerWrapper({ children }: { children: React.ReactNode }) {
  useNotificationListener();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const setup = async () => {
      try {
        const svc = PushNotificationService;
        await svc.initialize();

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const reg = await navigator.serviceWorker.ready;
          const existingSub = await reg.pushManager.getSubscription();
          if (!existingSub) {
            await svc.subscribe();
          }
        }
      } catch {}
    };
    setup();
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
}
