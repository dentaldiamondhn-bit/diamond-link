'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  showBrowserNotification,
  requestNotificationPermission,
  getNotificationPermission,
} from '@/lib/browserNotification';

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
    const result = await requestNotificationPermission();
    if (result === 'unsupported') return false;
    setPermission(result);
    return result === 'granted';
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
        minute: '2-digit',
        timeZone: 'America/Tegucigalpa' // Explicitly set to Honduras timezone
      });
      
      // Add time information to the notification body
      if (body) {
        body += ` | ${formattedTime}`;
      } else {
        body = formattedTime;
      }
    }

    // Create notification that works in both mobile and desktop modes
    let onClickUrl = '';
    if (options.data?.type === 'calendar_event' || options.data?.type === 'calendar_task') {
      onClickUrl = '/calendario';
    }

    showBrowserNotification({
      title,
      body,
      icon: '/Logo.svg',
      badge: '/Logo.svg',
      tag: (options.data?.type as string) || 'general',
      requireInteraction: options.requireInteraction || false,
      data: options.data,
      onClickUrl,
    });

    // Play sound if enabled
    if (settings.soundEnabled) {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(() => {
          // Ignore audio play errors
        });
      } catch (error) {
        // Ignore audio errors
      }
    }

    console.log(`✅ Browser notification shown: ${title}`);
  }, [permission, settings]);

  // Check notification permission on mount
  useEffect(() => {
    const p = getNotificationPermission();
    if (p !== 'unsupported') {
      setPermission(p);
    }
  }, []);

  // Expose notification function to window for manual use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showNotification = showNotification;
    }
  }, [showNotification]);

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        🔔 Browser Notifications
      </h3>
      
      <div className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">Permission:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            permission === 'granted' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : permission === 'denied'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }`}>
            {permission === 'granted' ? '✅ Granted' : permission === 'denied' ? '❌ Denied' : '⏳ Default'}
          </span>
        </div>

        {/* Settings */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Enable notifications</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Enable sound</span>
          </label>
        </div>

        {/* Request Permission Button */}
        {permission !== 'granted' && (
          <button
            onClick={requestPermission}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔔 Request Permission
          </button>
        )}

        {/* Test Button */}
        {permission === 'granted' && (
          <button
            onClick={() => showNotification('Test Notification', {
              body: 'This is a test notification from Diamond Link',
              data: { type: 'test' }
            })}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            🔔 Test Notification
          </button>
        )}
      </div>
    </div>
  );
}
