'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class MobileNotificationService {
  private static instance: MobileNotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private listeners: Set<(notification: PushNotification) => void> = new Set();

  private constructor() {}

  static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  // Initialize the service
  async initialize(): Promise<boolean> {
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready for push notifications');
      }

      // Get existing subscription
      if (this.swRegistration) {
        this.subscription = await this.swRegistration.pushManager.getSubscription();
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('❌ This browser does not support notifications');
      return { granted: false, denied: true, default: false };
    }

    const permission = await Notification.requestPermission();
    
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  // Get current permission status
  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return { granted: false, denied: true, default: false };
    }

    const permission = Notification.permission;
    
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  // Show local notification (not push)
  showLocalNotification(notification: PushNotification): void {
    const permission = this.getPermission();
    
    if (!permission.granted) {
      console.warn('❌ Notification permission not granted');
      return;
    }

    const options: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || '/Logo.svg',
      badge: notification.badge || '/Logo.svg',
      tag: notification.tag,
      data: notification.data,
      requireInteraction: notification.requireInteraction || false,
      silent: notification.silent || false,
      timestamp: notification.timestamp || Date.now()
    };

    if (notification.actions && notification.actions.length > 0) {
      options.actions = notification.actions;
    }

    const notificationInstance = new Notification(notification.title, options);

    // Handle notification click
    notificationInstance.onclick = (event) => {
      event.preventDefault();
      
      // Focus the window if it's open
      if (window.focus) {
        window.focus();
      }

      // Handle notification click based on data
      if (notification.data?.url) {
        window.location.href = notification.data.url;
      }

      // Close the notification
      notificationInstance.close();
    };

    // Auto-close after 5 seconds if not required interaction
    if (!notification.requireInteraction) {
      setTimeout(() => {
        notificationInstance.close();
      }, 5000);
    }
  }

  // Check if push is supported
  isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }
}

// React Hook for using push notifications
export const useMobileNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  const [isSupported, setIsSupported] = useState(false);
  const serviceRef = useRef(MobileNotificationService.getInstance());

  useEffect(() => {
    const service = serviceRef.current;
    
    // Check if push is supported
    setIsSupported(service.isPushSupported());
    
    // Get current permission
    setPermission(service.getPermission());
    
    // Initialize service
    service.initialize();
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    const service = serviceRef.current;
    const result = await service.requestPermission();
    setPermission(result);
    return result;
  };

  const showNotification = (notification: PushNotification): void => {
    const service = serviceRef.current;
    service.showLocalNotification(notification);
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification
  };
};

export default MobileNotificationService;
