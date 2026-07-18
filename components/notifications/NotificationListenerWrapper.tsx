'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import PushNotificationService from '@/services/pushNotificationService';

type PushStatus = 'idle' | 'subscribing' | 'success' | 'failed';
const STATUS_MESSAGES: Record<PushStatus, string | null> = {
  idle: null,
  subscribing: 'Configurando notificaciones push...',
  success: 'Notificaciones push activadas',
  failed: 'Error al activar notificaciones push',
};

export function NotificationListenerWrapper({ children }: { children: React.ReactNode }) {
  useNotificationListener();
  const { isLoaded, isSignedIn, user } = useUser();
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);

  const showStatus = useCallback((status: PushStatus, detail?: string) => {
    setPushStatus(status);
    if (detail) setStatusDetail(detail);
    if (status === 'success' || status === 'failed') {
      setTimeout(() => setPushStatus('idle'), 6000);
    }
  }, []);

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
            showStatus('success', 'Sincronizada');
          } else {
            showStatus('subscribing');
            const ok = await svc.subscribe();
            if (ok) {
              showStatus('success');
            } else {
              const subStatus = svc.getSubscriptionStatus();
              showStatus('failed', `isSubscribed=${subStatus.isSubscribed}, permission=${subStatus.permission}`);
            }
          }
        } else {
          const perm = typeof Notification !== 'undefined' ? Notification.permission : 'N/A';
          if (perm === 'denied') {
            showStatus('failed', 'Permiso denegado — actívelo en configuración del navegador');
          }
        }
      } catch (e) {
        showStatus('failed', e instanceof Error ? e.message : 'Error desconocido');
      }
    };
    setup();
  }, [isLoaded, isSignedIn, showStatus]);

  return (
    <>
      {children}
      {pushStatus !== 'idle' && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 9999,
            padding: '12px 16px',
            borderRadius: 8,
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'opacity 0.3s',
            backgroundColor:
              pushStatus === 'success' ? '#16a34a' :
              pushStatus === 'failed' ? '#dc2626' :
              '#2563eb',
          }}
        >
          <span>
            {pushStatus === 'success' ? '✓' :
             pushStatus === 'failed' ? '✗' :
             '⟳'}
          </span>
          <span style={{ flex: 1 }}>
            {STATUS_MESSAGES[pushStatus]}
            {statusDetail && ` — ${statusDetail}`}
          </span>
        </div>
      )}
    </>
  );
}
