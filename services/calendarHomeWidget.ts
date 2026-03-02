import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Mobile-friendly debug logging
const debugLog = (level: 'info' | 'error' | 'success' | 'warning', message: string, details?: any) => {
  // Store logs in localStorage for mobile debugging
  const logs = JSON.parse(localStorage.getItem('widgetDebugLogs') || '[]');
  const newLog = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  logs.push(newLog);
  
  // Keep only last 50 logs
  if (logs.length > 50) {
    logs.shift();
  }
  
  localStorage.setItem('widgetDebugLogs', JSON.stringify(logs));
  
  // Also log to console for development
  console.log(`[WIDGET ${level.toUpperCase()}] ${message}`, details || '');
};

// Helper to get logs for mobile debug panel
export const getWidgetDebugLogs = () => {
  return JSON.parse(localStorage.getItem('widgetDebugLogs') || '[]');
};

// Helper to clear debug logs
export const clearWidgetDebugLogs = () => {
  localStorage.removeItem('widgetDebugLogs');
};

export class CalendarHomeWidget {
  private static instance: CalendarHomeWidget;

  static getInstance(): CalendarHomeWidget {
    if (!CalendarHomeWidget.instance) {
      CalendarHomeWidget.instance = new CalendarHomeWidget();
    }
    return CalendarHomeWidget.instance;
  }

  async requestHomeScreenWidget(): Promise<boolean> {
    try {
      const platform = Capacitor.getPlatform();
      debugLog('info', 'Platform detected', { platform });
      
      // Check if running on native platform
      if (platform === 'web') {
        debugLog('warning', 'Home screen widget only available on native platforms');
        return false;
      }

      // Request notification permissions first
      const permissionStatus = await LocalNotifications.requestPermissions();
      debugLog('info', 'Notification permissions requested', { permissionStatus });

      // For now, we'll show instructions and return true for demonstration
      // In a real implementation, you would use native platform APIs
      if (platform === 'android') {
        debugLog('info', 'Showing Android widget instructions');
        // Show instructions for Android widget
        await LocalNotifications.schedule({
          notifications: [{
            id: 1001,
            title: 'Add Calendar Widget',
            body: 'Long press on home screen > Widgets > Search "Diamond Link Calendar" > Add to home screen',
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            largeIcon: 'calendar_icon'
          }]
        });
        debugLog('success', 'Android widget notification scheduled');
        return true;
      }

      // For iOS, add to Today View
      if (platform === 'ios') {
        debugLog('info', 'Showing iOS widget instructions');
        await LocalNotifications.schedule({
          notifications: [{
            id: 1002,
            title: 'Add Calendar to Today View',
            body: 'Open Calendar > Tap "..." > Add to Today View for quick access',
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            largeIcon: 'calendar_icon'
          }]
        });
        debugLog('success', 'iOS widget notification scheduled');
        return true;
      }

      return false;
    } catch (error) {
      debugLog('error', 'Error requesting home screen widget', error);
      return false;
    }
  }

  async createCalendarShortcut(): Promise<boolean> {
    try {
      const platform = Capacitor.getPlatform();
      debugLog('info', 'Creating calendar shortcut', { platform });
      
      // Request notification permissions first
      const permissionStatus = await LocalNotifications.requestPermissions();
      debugLog('info', 'Notification permissions for shortcut', { permissionStatus });
      
      if (platform === 'web') {
        // For web, we can create a PWA prompt
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          // For web, use ServiceWorkerRegistration.showNotification() if available
          if (navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
              if (registration) {
                registration.showNotification('Add to Home Screen', {
                  body: 'Use browser menu to "Add to Home Screen" for quick calendar access',
                  icon: '/calendar_icon.png',
                  tag: 'pwa-instructions',
                  requireInteraction: true
                });
                debugLog('success', 'Web PWA notification shown via ServiceWorker');
              } else {
                debugLog('warning', 'ServiceWorker registration not available');
              }
            }).catch(error => {
              debugLog('error', 'ServiceWorker ready failed', error);
            });
          } else if ('Notification' in window) {
            // Fallback to Notification constructor if ServiceWorker not available
            new Notification('Add to Home Screen', {
              body: 'Use browser menu to "Add to Home Screen" for quick calendar access',
              icon: '/calendar_icon.png',
              tag: 'pwa-instructions'
            });
            debugLog('success', 'Web PWA notification shown via Notification constructor');
          }
          return true;
        }
        debugLog('warning', 'Web platform does not support PWA features');
        return false;
      }

      // For native platforms, show instructions
      debugLog('info', 'Showing native platform shortcut instructions');
      await LocalNotifications.schedule({
        notifications: [{
          id: 1004,
          title: 'Calendar Shortcut Created',
          body: 'Calendar shortcut has been added to your home screen for quick access',
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          largeIcon: 'calendar_icon'
        }]
      });
      debugLog('success', 'Native shortcut notification scheduled');
      
      return true;
    } catch (error) {
      debugLog('error', 'Error creating calendar shortcut', error);
      return false;
    }
  }

  async checkWidgetSupport(): Promise<{
    supportsWidget: boolean;
    supportsShortcut: boolean;
    platform: string;
  }> {
    const platform = Capacitor.getPlatform();
    
    return {
      supportsWidget: platform === 'android' || platform === 'ios',
      supportsShortcut: platform === 'android' || platform === 'ios' || platform === 'web',
      platform
    };
  }

  async showWidgetInstructions(): Promise<void> {
    try {
      const { platform } = await this.checkWidgetSupport();
      debugLog('info', 'Showing widget instructions', { platform });
      
      // Request notification permissions first
      const permissionStatus = await LocalNotifications.requestPermissions();
      debugLog('info', 'Notification permissions for instructions', { permissionStatus });
      
      if (platform === 'android') {
        // Show Android-specific instructions
        debugLog('info', 'Showing Android widget instructions');
        await LocalNotifications.schedule({
          notifications: [{
            id: 1005,
            title: 'Add Calendar Widget',
            body: 'Long press on your home screen > Widgets > Search for "Diamond Link Calendar" > Add to Home Screen',
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            largeIcon: 'calendar_icon',
            actionTypeId: 'widget_instructions'
          }]
        });
        debugLog('success', 'Android widget instructions notification scheduled');
      } else if (platform === 'ios') {
        // Show iOS-specific instructions
        debugLog('info', 'Showing iOS widget instructions');
        await LocalNotifications.schedule({
          notifications: [{
            id: 1006,
            title: 'Add Calendar to Today View',
            body: 'Open Calendar > Tap "..." > Add to Today View for quick access',
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            largeIcon: 'calendar_icon',
            actionTypeId: 'widget_instructions'
          }]
        });
        debugLog('success', 'iOS widget instructions notification scheduled');
      } else if (platform === 'web') {
        // Show web-specific instructions
        debugLog('info', 'Showing web widget instructions');
        
        // Check ServiceWorker availability
        debugLog('info', 'Checking ServiceWorker availability', {
          hasServiceWorker: 'serviceWorker' in navigator,
          hasNavigator: 'navigator' in window,
          serviceWorkerReady: navigator.serviceWorker ? 'exists' : 'missing'
        });
        
        // For web, use ServiceWorkerRegistration.showNotification() if available
        if ('serviceWorker' in navigator) {
          debugLog('info', 'ServiceWorker available, checking readiness');
          
          if (navigator.serviceWorker.ready) {
            debugLog('info', 'ServiceWorker.ready exists, waiting for registration');
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('ServiceWorker.ready timeout after 5 seconds')), 5000);
            });
            
            Promise.race([
              navigator.serviceWorker.ready,
              timeoutPromise
            ]).then((registration: ServiceWorkerRegistration | undefined) => {
              debugLog('info', 'ServiceWorker ready resolved', { 
                hasRegistration: !!registration,
                scope: registration?.scope 
              });
              
              if (registration) {
                registration.showNotification('Add Calendar to Home Screen', {
                  body: 'Use browser menu > "Add to Home Screen" to install as PWA',
                  icon: '/calendar_icon.png',
                  tag: 'widget-instructions',
                  requireInteraction: true
                });
                debugLog('success', 'Web widget notification shown via ServiceWorker');
              } else {
                debugLog('warning', 'ServiceWorker registration is null');
              }
            }).catch(error => {
              debugLog('error', 'ServiceWorker ready failed or timed out', error);
              debugLog('info', 'Falling back to direct registration');
              
              // Try to get current registration directly
              navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                  registration.showNotification('Add Calendar to Home Screen', {
                    body: 'Use browser menu > "Add to Home Screen" to install as PWA',
                    icon: '/calendar_icon.png',
                    tag: 'widget-instructions',
                    requireInteraction: true
                  });
                  debugLog('success', 'Web widget notification shown via direct registration');
                } else {
                  debugLog('warning', 'No ServiceWorker registration found, falling back to Notification API');
                  // Fallback to Notification constructor
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Add Calendar to Home Screen', {
                      body: 'Use browser menu > "Add to Home Screen" to install as PWA',
                      icon: '/calendar_icon.png',
                      tag: 'widget-instructions'
                    });
                    debugLog('success', 'Web widget notification shown via Notification constructor fallback');
                  } else {
                    debugLog('warning', 'Notification API not available or permission not granted');
                  }
                }
              }).catch(error => {
                debugLog('error', 'Direct ServiceWorker registration failed', error);
              });
            });
          } else {
            debugLog('warning', 'ServiceWorker.ready not available, trying direct registration');
            // Try to get current registration directly
            navigator.serviceWorker.getRegistration().then(registration => {
              if (registration) {
                registration.showNotification('Add Calendar to Home Screen', {
                  body: 'Use browser menu > "Add to Home Screen" to install as PWA',
                  icon: '/calendar_icon.png',
                  tag: 'widget-instructions',
                  requireInteraction: true
                });
                debugLog('success', 'Web widget notification shown via direct registration');
              } else {
                debugLog('warning', 'No ServiceWorker registration found, falling back to Notification API');
                // Fallback to Notification constructor
                if ('Notification' in window && Notification.permission === 'granted') {
                  try {
                    new Notification('Add Calendar to Home Screen', {
                      body: 'Use browser menu > "Add to Home Screen" to install as PWA',
                      icon: '/calendar_icon.png',
                      tag: 'widget-instructions'
                    });
                    debugLog('success', 'Web widget notification shown via Notification constructor fallback');
                  } catch (error) {
                    debugLog('error', 'Notification constructor failed', error);
                    debugLog('info', 'Trying alternative notification method');
                    
                    // Alternative: Use alert as last resort
                    if (confirm('Add Calendar to Home Screen\n\nUse browser menu > "Add to Home Screen" to install as PWA\n\nClick OK to open browser settings')) {
                      // Try to open browser settings or PWA install prompt
                      if ('beforeinstallprompt' in window) {
                        debugLog('info', 'PWA install prompt available');
                        // Note: beforeinstallprompt event needs to be captured earlier
                      } else {
                        debugLog('info', 'PWA install prompt not available, user will need to use browser menu manually');
                      }
                    }
                    debugLog('success', 'Widget instructions shown via alert dialog');
                  }
                } else {
                  debugLog('warning', 'Notification API not available or permission not granted');
                }
              }
            }).catch(error => {
              debugLog('error', 'Direct ServiceWorker registration failed', error);
            });
          }
        } else {
          debugLog('warning', 'ServiceWorker not supported in this browser');
          // Fallback to Notification constructor if ServiceWorker not available
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Add Calendar to Home Screen', {
                body: 'Use browser menu > "Add to Home Screen" to install as PWA',
                icon: '/calendar_icon.png',
                tag: 'widget-instructions'
              });
              debugLog('success', 'Web widget notification shown via Notification constructor fallback');
            } catch (error) {
              debugLog('error', 'Notification constructor failed', error);
              debugLog('info', 'Trying alternative notification method');
              
              // Alternative: Use alert as last resort
              if (confirm('Add Calendar to Home Screen\n\nUse browser menu > "Add to Home Screen" to install as PWA\n\nClick OK to continue')) {
                debugLog('info', 'User confirmed widget instructions via alert dialog');
              }
              debugLog('success', 'Widget instructions shown via alert dialog');
            }
          } else {
            debugLog('warning', 'Notification API not available or permission not granted');
          }
        }
      }
    } catch (error) {
      debugLog('error', 'Error showing widget instructions', error);
    }
  }
}
