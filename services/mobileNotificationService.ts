'use client';

import React, { useEffect, useRef, useState } from 'react';

// Extend the global NotificationOptions to include actions and timestamp
declare global {
  interface NotificationOptions {
    actions?: NotificationAction[];
    timestamp?: number;
  }
}

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

// Device detection utility - with error handling for all devices
function detectDevice(): {
  isAndroid: boolean;
  isIOS: boolean;
  isPWA: boolean;
  browser: string;
  supportsNotifications: boolean;
  supportsVibration: boolean;
  supportsServiceWorker: boolean;
  supportsPush: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isIOS: false,
      isPWA: false,
      browser: 'unknown',
      supportsNotifications: false,
      supportsVibration: false,
      supportsServiceWorker: false,
      supportsPush: false
    };
  }

  try {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isAndroid = ua.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(ua);
    
    // Detect PWA mode - with try/catch for safety
    let isPWA = false;
    try {
      isPWA = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || 
        (window.navigator as any).standalone === true ||
        (document.referrer && document.referrer.includes('android-app://'));
    } catch (e) {
      // Ignore errors in PWA detection
    }

    // Detect browser
    let browser = 'unknown';
    if (ua.includes('chrome')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari')) browser = 'safari';
    else if (ua.includes('samsung')) browser = 'samsung';
    else if (ua.includes('edge')) browser = 'edge';

    return {
      isAndroid,
      isIOS,
      isPWA,
      browser,
      supportsNotifications: typeof Notification !== 'undefined',
      supportsVibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
      supportsServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      supportsPush: typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    };
  } catch (error) {
    // Return safe defaults on any error
    return {
      isAndroid: false,
      isIOS: false,
      isPWA: false,
      browser: 'unknown',
      supportsNotifications: false,
      supportsVibration: false,
      supportsServiceWorker: false,
      supportsPush: false
    };
  }
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
      // Register service worker with better error handling
      if ('serviceWorker' in navigator) {
        try {
          // Try to get ready service worker first
          this.swRegistration = await navigator.serviceWorker.ready;
          console.log('✅ Service Worker ready for notifications');
        } catch (error) {
          console.warn('⚠️ Service Worker not ready, trying manual registration:', error);
          
          // Fallback: try to register manually
          try {
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker manually registered');
          } catch (regError) {
            console.warn('⚠️ Manual service worker registration failed:', regError);
            this.swRegistration = null;
          }
        }
      } else {
        console.warn('⚠️ Service Worker not supported in this browser');
        this.swRegistration = null;
      }

      // Get existing subscription
      if (this.swRegistration) {
        try {
          this.subscription = await this.swRegistration.pushManager.getSubscription();
        } catch (subError) {
          console.warn('⚠️ Failed to get push subscription:', subError);
        }
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

  // Show local notification (not push) - Multiple fallback methods with error handling
  async showLocalNotification(notification: PushNotification): Promise<void> {
    let device;
    let permission;
    
    try {
      device = detectDevice();
      permission = this.getPermission();
    } catch (e) {
      console.error('❌ Error detecting device:', e);
      device = { isAndroid: false, supportsVibration: false };
      permission = { granted: false, denied: true, default: false };
    }
    
    console.log('📱 Showing notification:', {
      device,
      permission,
      title: notification.title
    });

    try {
      // If no permission, try to request (though should be user-initiated)
      if (!permission.granted && !permission.denied) {
        try {
          const newPerm = await this.requestPermission();
          if (newPerm.granted) {
            return await this.showLocalNotification(notification);
          }
        } catch (e) {
          console.warn('⚠️ Could not request permission:', e);
        }
      }

      if (!permission.granted) {
        // Last resort: try振动 + beep without permission on Android
        console.warn('⚠️ No notification permission, using fallback');
        return await this.showFallbackNotification(notification, device);
      }

const options: any = { // Use any to avoid type issues with vibrate property
        body: notification.body,
        icon: notification.icon || '/Logo.svg',
        badge: notification.badge || '/Logo.svg',
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.requireInteraction || false,
        silent: notification.silent || false,
        timestamp: notification.timestamp || Date.now(),
        vibrate: [200, 100, 200] // Android vibration pattern
      };

      if (notification.actions && notification.actions.length > 0) {
        options.actions = notification.actions;
      }

      // Method 1: Try Service Worker (best for PWAs)
      try {
        if (!this.swRegistration && 'serviceWorker' in navigator) {
          this.swRegistration = await navigator.serviceWorker.ready;
        }
        if (this.swRegistration) {
          await this.swRegistration.showNotification(notification.title, options);
          console.log('✅ Notification via Service Worker');
          
          // Vibrate additionally on Android
          if (device.isAndroid && device.supportsVibration) {
            navigator.vibrate([200, 100, 200]);
          }
          return;
        }
      } catch (error) {
        console.warn('⚠️ Service Worker notification failed:', error);
      }

    // Method 2: Try direct Notification API
    if ('Notification' in window) {
      try {
        const notif = new Notification(notification.title, options);
        
        notif.onclick = (event) => {
          event.preventDefault();
          if (window.focus) window.focus();
          if (notification.data?.url) window.location.href = notification.data.url;
          notif.close();
        };

        if (!notification.requireInteraction) {
          setTimeout(() => notif.close(), 5000);
        }
        
        console.log('✅ Notification via Notification API');
        
        // Vibrate additionally on Android
        if (device.isAndroid && device.supportsVibration) {
          navigator.vibrate([200, 100, 200]);
        }
        return;
      } catch (error) {
        console.warn('⚠️ Notification API failed:', error);
      }
    }

    // Method 3: Android WebView fallback - use Android-specific apis
    if (device.isAndroid && !device.supportsPush) {
      try {
        await this.showAndroidWebViewNotification(notification);
        return;
      } catch (e) {
        console.warn('⚠️ Android WebView fallback failed:', e);
      }
    }

    // Method 4: Play sound + vibrate as last resort
      await this.showFallbackNotification(notification, device);
    } catch (error) {
      // Catch any unexpected error and don't crash
      console.error('❌ Error showing notification:', error);
    }
  }

  // Android WebView specific notification (for WebView-based browsers)
  private async showAndroidWebViewNotification(notification: PushNotification): Promise<void> {
    // Try to use Intent-based notification for Android
    if ((window as any).Android) {
      (window as any).Android.showNotification(
        notification.title,
        notification.body,
        notification.tag || 'default'
      );
      console.log('✅ Notification via Android WebView');
      return;
    }

    // Try NotificationChannel for Android 8+
    if ('NotificationChannel' in window) {
      // This is experimental, try anyway
      console.log('📱 Trying Android notification channel...');
    }

    throw new Error('Android WebView notification not available');
  }

  // Fallback: Sound + Vibration (works even without permission on some devices)
  private async showFallbackNotification(notification: PushNotification, device: ReturnType<typeof detectDevice>): Promise<void> {
    console.log('📱 Using fallback notification methods');

    // Always vibrate first (doesn't require permission)
    if (device.supportsVibration) {
      try {
        // Different patterns for different notification types
        if (notification.tag?.includes('reminder')) {
          navigator.vibrate([300, 150, 300, 150, 300]); // Longer for reminders
        } else {
          navigator.vibrate([200, 100, 200]); // Standard
        }
        console.log('📳 Vibration pattern sent');
      } catch (e) {
        console.warn('⚠️ Vibration failed:', e);
      }
    }

    // Play notification sound using Web Audio API
    try {
      await this.playNotificationSound();
      console.log('🔊 Notification sound played');
    } catch (e) {
      console.warn('⚠️ Sound playback failed:', e);
    }

    // If app is in background, try to bring to foreground
    if (device.isPWA) {
      try {
        // Request visibility to show notification
        if (document.hidden) {
          // Try to get focus
          window.focus();
        }
      } catch (e) {
        // Can't force focus due to browser security
      }
    }

    console.log('📱 Fallback notification shown:', notification.title);
  }

  // Play notification sound using Web Audio API
  private async playNotificationSound(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          reject(new Error('AudioContext not available'));
          return;
        }

        const audioContext = new AudioContext();
        
        // Create a more pleasant notification sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880; // A5 note
        oscillator.type = 'sine';
        
        // Fade in/out for smoother sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        
        // Play second tone
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 1100;
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.25, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.3);
        }, 150);

        setTimeout(resolve, 500);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Check if running on mobile browser
  private isMobileBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
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
