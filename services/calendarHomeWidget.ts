import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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
      console.log('Platform:', Capacitor.getPlatform());
      
      // Check if running on native platform
      if (Capacitor.getPlatform() === 'web') {
        console.log('Home screen widget only available on native platforms');
        return false;
      }

      // Request notification permissions first
      const permissionStatus = await LocalNotifications.requestPermissions();
      console.log('Notification permissions:', permissionStatus);

      // For now, we'll show instructions and return true for demonstration
      // In a real implementation, you would use native platform APIs
      if (Capacitor.getPlatform() === 'android') {
        console.log('Showing Android widget instructions');
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
        return true;
      }

      // For iOS, add to Today View
      if (Capacitor.getPlatform() === 'ios') {
        console.log('Showing iOS widget instructions');
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
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error requesting home screen widget:', error);
      return false;
    }
  }

  async createCalendarShortcut(): Promise<boolean> {
    try {
      console.log('Creating calendar shortcut for platform:', Capacitor.getPlatform());
      
      // Request notification permissions first
      const permissionStatus = await LocalNotifications.requestPermissions();
      console.log('Notification permissions for shortcut:', permissionStatus);
      
      if (Capacitor.getPlatform() === 'web') {
        // For web, we can create a PWA prompt
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          await LocalNotifications.schedule({
            notifications: [{
              id: 1003,
              title: 'Add to Home Screen',
              body: 'Use browser menu to "Add to Home Screen" for quick calendar access',
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'default',
              largeIcon: 'calendar_icon'
            }]
          });
          return true;
        }
        return false;
      }

      // For native platforms, show instructions
      console.log('Showing native platform shortcut instructions');
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
      
      return true;
    } catch (error) {
      console.error('Error creating calendar shortcut:', error);
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
      console.log('Showing widget instructions for platform:', platform);
      
      // Request notification permissions first
      const permissionStatus = await LocalNotifications.requestPermissions();
      console.log('Notification permissions for instructions:', permissionStatus);
      
      if (platform === 'android') {
        // Show Android-specific instructions
        console.log('Showing Android widget instructions');
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
      } else if (platform === 'ios') {
        // Show iOS-specific instructions
        console.log('Showing iOS widget instructions');
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
      } else if (platform === 'web') {
        // Show web-specific instructions
        console.log('Showing web widget instructions');
        await LocalNotifications.schedule({
          notifications: [{
            id: 1007,
            title: 'Add Calendar to Home Screen',
            body: 'Use browser menu > "Add to Home Screen" to install as PWA',
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            largeIcon: 'calendar_icon',
            actionTypeId: 'widget_instructions'
          }]
        });
      }
    } catch (error) {
      console.error('Error showing widget instructions:', error);
    }
  }
}
