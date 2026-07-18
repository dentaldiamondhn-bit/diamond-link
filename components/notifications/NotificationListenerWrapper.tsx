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
    PushNotificationService.initialize().catch(() => {});
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
}
