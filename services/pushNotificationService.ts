'use client';

export interface PushSubscription {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  unsubscribe?: () => Promise<boolean>;
}

export interface PushNotificationData {
  title: string;
  message: string;
  type: 'calendar_event' | 'calendar_task' | 'reminder' | 'general';
  metadata?: {
    eventId?: string;
    taskId?: string;
    eventTime?: string;
    taskTime?: string;
    patientName?: string;
    [key: string]: any;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private subscription: PushSubscription | null = null;
  private isSupported = false;

  private constructor() {
    this.checkSupport();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private checkSupport() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    console.log('📱 Push notification support:', this.isSupported);
  }

  // Initialize push notifications
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('❌ Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service worker registered:', registration);

      // Get existing subscription
      this.subscription = await registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('📱 Existing push subscription found');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      return false;
    }
  }

  // Request permission and subscribe
  async subscribe(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('❌ Push notifications not supported');
      return false;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);

      if (permission !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service worker registered');

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: this.urlBase64ToUint8Array(this.getVapidPublicKey()) as any
        // Temporarily disable VAPID key for demo - in production, you need a real VAPID key
      });

      console.log('📱 Push subscription created:', subscription);
      this.subscription = subscription;

      // Save subscription to server
      await this.saveSubscriptionToServer(subscription);

      return true;
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      console.log('❌ No active subscription to unsubscribe');
      return false;
    }

    try {
      if (this.subscription.unsubscribe) {
        await this.subscription.unsubscribe();
      }
      console.log('📱 Unsubscribed from push notifications');

      // Remove subscription from server
      await this.removeSubscriptionFromServer(this.subscription);

      this.subscription = null;
      return true;
    } catch (error) {
      console.error('❌ Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Get current subscription status
  getSubscriptionStatus(): {
    isSupported: boolean;
    isSubscribed: boolean;
    permission: NotificationPermission;
  } {
    return {
      isSupported: this.isSupported,
      isSubscribed: !!this.subscription,
      permission: this.isSupported ? Notification.permission : 'denied'
    };
  }

  // Send push notification (server-side)
  static async sendPushNotification(
    subscription: PushSubscription,
    data: PushNotificationData
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          data
        })
      });

      if (!response.ok) {
        console.error('❌ Error sending push notification:', await response.text());
        return false;
      }

      console.log('📬 Push notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  // Save subscription to server
  private async saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        console.error('❌ Error saving subscription to server:', await response.text());
      } else {
        console.log('✅ Subscription saved to server');
      }
    } catch (error) {
      console.error('❌ Error saving subscription to server:', error);
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        console.error('❌ Error removing subscription from server:', await response.text());
      } else {
        console.log('✅ Subscription removed from server');
      }
    } catch (error) {
      console.error('❌ Error removing subscription from server:', error);
    }
  }

  // Convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get VAPID public key (you should set this in your environment variables)
  private getVapidPublicKey(): string {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
           'BMdFTp6f6Qv3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k3k';
  }

  // Show test notification
  async showTestNotification(): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      console.log('❌ Cannot show test notification - not supported or permission denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification('Diamond Link - Test', {
        body: 'This is a test mobile notification',
        icon: '/Logo.svg',
        badge: '/Logo.svg',
        tag: 'test',
        requireInteraction: true
      });

      console.log('🔔 Test notification shown');
    } catch (error) {
      console.error('❌ Error showing test notification:', error);
    }
  }
}

export default PushNotificationService.getInstance();
