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
          if (existingSub) {
            console.log('Existing push subscription found, re-synced');
          } else {
            console.log('Permission granted but no subscription — attempting subscribe...');
            const ok = await svc.subscribe();
            console.log('Auto-subscribe result:', ok);
          }
        } else {
          console.log('Push not auto-subscribing — permission:', typeof Notification !== 'undefined' ? Notification.permission : 'N/A');
        }
      } catch (e) {
        console.error('Notification setup error:', e);
      }
    };
    setup();
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
}
