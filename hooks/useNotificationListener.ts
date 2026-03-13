'use client';

import { useEffect, useRef } from 'react';
import { useBellNotifications } from '../contexts/BellNotificationContext';

export function useNotificationListener() {
  const { notifications } = useBellNotifications();
  const lastNotificationCount = useRef(0);
  const processedNotifications = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check for new notifications
    const currentCount = notifications.length;
    
    if (currentCount > lastNotificationCount.current) {
      // We have new notifications
      const newNotifications = notifications.slice(0, currentCount - lastNotificationCount.current);
      
      newNotifications.forEach(notification => {
        // Only trigger browser notification for unread notifications we haven't processed yet
        if (!notification.read && !processedNotifications.current.has(notification.id)) {
          triggerBrowserNotification(notification);
          processedNotifications.current.add(notification.id);
        }
      });
      
      lastNotificationCount.current = currentCount;
    }
  }, [notifications]);

  // Clean up processed notifications periodically to prevent memory leaks
  useEffect(() => {
    const interval = setInterval(() => {
      // Remove old processed notification IDs (keep only last 50)
      const allIds = notifications.map(n => n.id);
      const recentIds = allIds.slice(0, 50);
      processedNotifications.current = new Set(
        Array.from(processedNotifications.current).filter(id => recentIds.includes(id))
      );
    }, 60000); // Clean up every minute

    return () => clearInterval(interval);
  }, [notifications]);
}

function triggerBrowserNotification(notification: any) {
  // Check if browser notifications are supported and permission is granted
  if ('Notification' in window && Notification.permission === 'granted') {
    // Extract event time from metadata if available
    let body = notification.message;
    if (notification.metadata?.eventTime || notification.metadata?.taskTime) {
      const eventTime = new Date(notification.metadata.eventTime || notification.metadata.taskTime);
      const formattedTime = eventTime.toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Add time information to the notification body
      body += ` | ${formattedTime}`;
    }

    console.log(`🔔 Triggering browser notification: ${notification.title}`);

    // Create notification that works in both mobile and desktop modes
    const browserNotification = new Notification(notification.title, {
      icon: '/Logo.svg', // Use the proper logo
      badge: '/Logo.svg', // Use the proper logo for badge
      tag: notification.type || 'general',
      requireInteraction: false, // Changed to false for better mobile experience
      body: body,
      data: notification.metadata,
    });

    // Play sound if available (disabled to prevent 404 errors)
    // try {
    //   const audio = new Audio('/notification-sound.mp3');
    //   audio.play().catch(() => {
    //     console.log('🔊 Audio play failed (this is normal in many browsers)');
    //   });
    // } catch (error) {
    //   console.log('🔊 Audio not available');
    // }

    // Handle notification click
    browserNotification.onclick = () => {
      console.log('🖱️ Browser notification clicked');
      browserNotification.close();
      
      // Focus the window if possible
      if (window.focus) {
        window.focus();
      }
      
      // Navigate to calendar if it's a calendar notification
      if (notification.type === 'calendar_event' || notification.type === 'calendar_task') {
        window.location.href = '/calendario';
      }
    };

    // Auto-close after 8 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 8000);

    console.log(`✅ Browser notification triggered successfully: ${notification.title}`);
  } else {
    console.log('🔔 Browser notifications not available or permission not granted');
    
    // Request permission if it's 'default'
    if ('Notification' in window && Notification.permission === 'default') {
      console.log('🔔 Requesting browser notification permission...');
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('✅ Browser notification permission granted!');
          // Try again with the notification
          triggerBrowserNotification(notification);
        } else {
          console.log('❌ Browser notification permission denied');
        }
      });
    }
  }
}
