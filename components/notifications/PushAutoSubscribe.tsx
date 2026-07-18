'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export function PushAutoSubscribe() {
  const { isLoaded, isSignedIn } = useUser();
  const [debug, setDebug] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    const run = async () => {
      try {
        setDebug('Cargando servicio push...');

        const { default: svc } = await import('@/services/pushNotificationService');
        if (cancelled) return;

        setDebug('Servicio cargado, inicializando...');
        await svc.initialize();

        setDebug('Verificando suscripción existente...');
        const reg = await navigator.serviceWorker.ready;
        if (cancelled) return;

        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          setDebug('Suscripción ya existe, sincronizada con servidor');
          setTimeout(() => setDebug(null), 3000);
          return;
        }

        setDebug('Sin suscripción — solicitando permiso...');
        const ok = await svc.subscribe();
        if (ok) {
          setDebug('Suscripción creada exitosamente');
        } else {
          const perm = Notification.permission;
          setDebug(`Fallo al suscribir: permiso=${perm}`);
        }

        setTimeout(() => setDebug(null), 5000);
      } catch (e) {
        setDebug(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return debug ? (
    <div
      style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
        padding: '10px 14px', borderRadius: 8, color: '#fff',
        fontSize: 13, fontWeight: 500,
        backgroundColor: debug.includes('exitosa') ? '#16a34a' : debug.includes('Error') || debug.includes('Fallo') ? '#dc2626' : '#2563eb',
      }}
    >
      {debug}
    </div>
  ) : null;
}
