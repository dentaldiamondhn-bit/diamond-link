'use client';

import { useState } from 'react';
import { useBellNotifications } from '@/contexts/BellNotificationContext';
import {
  showBrowserNotification,
  requestNotificationPermission,
} from '@/lib/browserNotification';

export function NotificationTester() {
  const { addNotification } = useBellNotifications();
  const [isTesting, setIsTesting] = useState(false);

  const testBellNotification = async () => {
    setIsTesting(true);
    try {
      await addNotification({
        type: 'calendar_event',
        title: 'Test Event Notification',
        message: 'This is a test bell notification for invitees',
        metadata: {
          eventId: 'test-event-id',
          eventTitle: 'Test Event',
          eventTime: new Date(),
          patientName: 'Test Patient'
        }
      });
      console.log('✅ Bell notification test sent');
    } catch (error) {
      console.error('❌ Bell notification test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const testBrowserNotification = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        await showBrowserNotification({
          title: 'Test Browser Notification',
          body: 'This is a test browser notification with Logo.svg',
          icon: '/Logo.svg',
          badge: '/Logo.svg',
          tag: 'test-notification',
          requireInteraction: true,
          data: {
            type: 'test',
            eventTime: new Date().toISOString()
          }
        });
        console.log('✅ Browser notification test sent');
      } else if (Notification.permission === 'default') {
        const result = await requestNotificationPermission();
        if (result === 'granted') {
          testBrowserNotification();
        }
      } else {
        console.log('❌ Browser notification permission not granted');
      }
    } else {
      console.log('❌ Browser notifications not supported');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Notification Testing</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Bell Notification Test</h4>
          <button
            onClick={testBellNotification}
            disabled={isTesting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isTesting ? 'Testing...' : 'Test Bell Notification'}
          </button>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Browser Notification Test</h4>
          <button
            onClick={testBrowserNotification}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Browser Notification
          </button>
        </div>

        <div className="text-xs text-gray-600">
          <p>• Bell notifications appear in the notification dropdown</p>
          <p>• Browser notifications appear in the system notification center</p>
          <p>• Check the console for test results</p>
        </div>
      </div>
    </div>
  );
}
