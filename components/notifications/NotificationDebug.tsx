'use client';

import { useState } from 'react';
import { useBellNotifications } from '@/contexts/BellNotificationContext';

export function NotificationDebug() {
  const { addNotification, notifications } = useBellNotifications();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
    console.log(`🔍 Debug: ${info}`);
  };

  const testBrowserPermission = async () => {
    addDebugInfo('Testing browser notification permission...');
    
    if (!('Notification' in window)) {
      addDebugInfo('❌ Browser notifications not supported');
      return;
    }

    const permission = Notification.permission;
    addDebugInfo(`Current permission: ${permission}`);

    if (permission === 'default') {
      addDebugInfo('Requesting permission...');
      const result = await Notification.requestPermission();
      addDebugInfo(`Permission request result: ${result}`);
    }

    if (permission === 'granted') {
      addDebugInfo('✅ Permission granted - testing notification...');
      testDirectBrowserNotification();
    } else {
      addDebugInfo('❌ Permission denied - cannot test browser notifications');
    }
  };

  const testDirectBrowserNotification = () => {
    try {
      const notification = new Notification('Debug Test', {
        icon: '/Logo.svg',
        badge: '/Logo.svg',
        body: 'Direct browser notification test',
        tag: 'debug-test',
        requireInteraction: true,
        data: { test: true }
      });

      addDebugInfo('✅ Browser notification created successfully');

      setTimeout(() => {
        notification.close();
        addDebugInfo('✅ Browser notification closed');
      }, 3000);

    } catch (error) {
      addDebugInfo(`❌ Browser notification failed: ${error}`);
    }
  };

  const testBellNotification = async () => {
    addDebugInfo('Testing bell notification...');
    
    try {
      await addNotification({
        type: 'calendar_event',
        title: 'Debug Bell Test',
        message: 'Testing bell notification system',
        metadata: {
          eventId: 'debug-event',
          eventTitle: 'Debug Event',
          eventTime: new Date(),
          patientName: 'Debug Patient'
        }
      });
      addDebugInfo('✅ Bell notification sent successfully');
    } catch (error) {
      addDebugInfo(`❌ Bell notification failed: ${error}`);
    }
  };

  const testInviteeNotification = async () => {
    addDebugInfo('Testing invitee notification service...');
    
    try {
      const response = await fetch('/api/notifications/send-to-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user',
          notification: {
            type: 'calendar_event',
            title: 'Debug Invitee Test',
            message: 'Testing invitee notification service',
            metadata: {
              eventId: 'debug-invitee-event',
              eventTitle: 'Debug Invitee Event',
              eventTime: new Date(),
              patientName: 'Debug Invitee Patient'
            }
          }
        })
      });

      if (response.ok) {
        addDebugInfo('✅ Invitee notification sent successfully');
      } else {
        const error = await response.text();
        addDebugInfo(`❌ Invitee notification failed: ${error}`);
      }
    } catch (error) {
      addDebugInfo(`❌ Invitee notification failed: ${error}`);
    }
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow max-w-2xl">
      <h3 className="text-lg font-semibold mb-4">Notification Debug Panel</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={testBrowserPermission}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Browser Permission
        </button>
        
        <button
          onClick={testDirectBrowserNotification}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Test Browser Notification
        </button>
        
        <button
          onClick={testBellNotification}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Test Bell Notification
        </button>
        
        <button
          onClick={testInviteeNotification}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Test Invitee Service
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">Debug Log</h4>
          <button
            onClick={clearDebug}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-100 p-2 rounded h-40 overflow-y-auto text-xs font-mono">
          {debugInfo.length === 0 ? (
            <div className="text-gray-500">No debug info yet...</div>
          ) : (
            debugInfo.map((info, index) => (
              <div key={index} className={info.includes('❌') ? 'text-red-600' : info.includes('✅') ? 'text-green-600' : 'text-gray-700'}>
                {info}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Current Notifications ({notifications.length})</h4>
        <div className="bg-gray-100 p-2 rounded h-32 overflow-y-auto text-xs">
          {notifications.length === 0 ? (
            <div className="text-gray-500">No notifications yet...</div>
          ) : (
            notifications.map((notif, index) => (
              <div key={notif.id} className="mb-2 p-2 bg-white rounded">
                <div className="font-semibold">{notif.title}</div>
                <div className="text-gray-600">{notif.message}</div>
                <div className="text-gray-400">{notif.read ? 'Read' : 'Unread'}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
