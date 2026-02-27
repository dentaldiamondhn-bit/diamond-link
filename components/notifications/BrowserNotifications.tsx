'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
}

export function BrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
  });

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  }, []);

  // Show browser notification
  const showNotification = useCallback((
    title: string,
    options: NotificationOptions = {}
  ) => {
    if (!settings.enabled || permission !== 'granted') return;

    // Extract event time from metadata if available
    let body = options.body || '';
    if (options.data?.eventTime || options.data?.taskTime) {
      const eventTime = new Date(options.data.eventTime || options.data.taskTime);
      const formattedTime = eventTime.toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Add time information to the notification body
      if (body) {
        body += ` | ${formattedTime}`;
      } else {
        body = formattedTime;
      }
    }

    const notification = new Notification(title, {
      icon: '/Logo.svg', // Use the proper logo
      badge: '/Logo.svg', // Use the proper logo for badge
      tag: options.data?.type || 'general',
      requireInteraction: options.requireInteraction || true, // Default to true for calendar notifications
      body: body,
      data: options.data,
      ...options,
    });

    // Play sound if enabled
    if (settings.soundEnabled) {
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    }

    // Auto-close after 8 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 8000);
    }

    return notification;
  }, [permission, settings]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Expose notification function to window for manual use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showNotification = showNotification;
    }
  }, [showNotification]);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Configuración de Notificaciones</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Notificaciones del Navegador</span>
          <button
            onClick={requestPermission}
            disabled={permission === 'granted'}
            className={`px-3 py-1 rounded text-sm ${
              permission === 'granted'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            {permission === 'granted' ? 'Habilitadas' : 'Habilitar'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Activar Notificaciones</span>
          <button
            onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Sonido de Notificación</span>
          <button
            onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={() => showNotification('Notificación de Prueba', {
            body: 'Esta es una notificación de prueba para verificar que todo funciona correctamente.',
            data: {
              type: 'test',
              eventTime: new Date().toISOString() // Test event time display
            }
          })}
          disabled={!settings.enabled || permission !== 'granted'}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Probar Notificación
        </button>
      </div>
    </div>
  );
}
