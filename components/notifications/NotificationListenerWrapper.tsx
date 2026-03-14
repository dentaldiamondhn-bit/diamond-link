'use client';

import React, { useEffect } from 'react';
import { useBellNotifications, addNotification } from '../contexts/BellNotificationContext';

export function NotificationListenerWrapper({ children }: { children: React.ReactNode }) {
  const { notifications, setNotifications } = useBellNotifications();

  // Check for global notifications from API calls
  useEffect(() => {
    const checkGlobalNotifications = () => {
      if ((global as any).pendingNotifications && (global as any).pendingNotifications.length > 0) {
        console.log('🌐 Found global notifications:', (global as any).pendingNotifications);
        
        (global as any).pendingNotifications.forEach(globalNotification => {
          // Add to BellNotificationContext so useNotificationListener hook can process it
          addNotification({
            id: globalNotification.userId + Date.now(),
            title: globalNotification.notification.title,
            message: globalNotification.notification.body,
            type: globalNotification.notification.tag?.replace('calendar-', '') || 'general',
            metadata: globalNotification.notification.data,
            read: false,
            timestamp: new Date().toISOString()
          });
        });
        
        // Clear global notifications
        (global as any).pendingNotifications = [];
      }
    };

    // Check immediately and then every 2 seconds
    checkGlobalNotifications();
    const interval = setInterval(checkGlobalNotifications, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
