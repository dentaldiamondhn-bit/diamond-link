import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
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
      // Check if running on native platform
      if (Capacitor.getPlatform() === 'web') {
        console.log('Home screen widget only available on native platforms');
        return false;
      }

      // Request to add widget to home screen (Android)
      if (Capacitor.getPlatform() === 'android') {
        const canAddWidget = await AppLauncher.canAddWidgetToHomeScreen();
        if (canAddWidget) {
          const added = await AppLauncher.addWidgetToHomeScreen({
            widgetName: 'calendar_widget',
            widgetLabel: 'Diamond Link Calendar',
            widgetPreview: '📅',
            widgetDescription: 'Quick access to your calendar appointments'
          });
          
          if (added) {
            console.log('Calendar widget added to home screen');
            // Show success notification
            await LocalNotifications.schedule({
              id: 'widget-added',
              title: 'Widget Added Successfully',
              body: 'Calendar widget has been added to your home screen',
              scheduleTime: new Date(Date.now() + 5000),
              sound: 'default',
              smallIcon: 'calendar_icon',
              largeIcon: 'calendar_icon'
            });
            return true;
          }
        }
      }

      // For iOS, add to Today View (alternative approach)
      if (Capacitor.getPlatform() === 'ios') {
        // iOS doesn't support home screen widgets in the same way
        // But we can add to Today View or create a shortcut
        const canAddToToday = await AppLauncher.canAddToTodayView();
        if (canAddToToday) {
          const added = await AppLauncher.addToTodayView({
            appName: 'Diamond Link Calendar',
            appUrl: '/calendario',
            appIcon: 'calendar_icon'
          });
          
          if (added) {
            console.log('Calendar added to Today View');
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error requesting home screen widget:', error);
      return false;
    }
  }

  async createCalendarShortcut(): Promise<boolean> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        return false;
      }

      // Create a home screen shortcut for quick calendar access
      const canCreateShortcut = await AppLauncher.canCreateShortcut();
      if (canCreateShortcut) {
        const created = await AppLauncher.createShortcut({
          id: 'calendar-shortcut',
          name: 'Diamond Link Calendar',
          shortName: 'Calendar',
          description: 'Quick access to calendar appointments',
          url: '/calendario',
          icon: 'calendar_icon'
        });
        
        if (created) {
          console.log('Calendar shortcut created successfully');
          await LocalNotifications.schedule({
            id: 'shortcut-created',
            title: 'Calendar Shortcut Created',
            body: 'Quick access to calendar has been added to your home screen',
            scheduleTime: new Date(Date.now() + 5000),
            sound: 'default',
            smallIcon: 'calendar_icon',
            largeIcon: 'calendar_icon'
          });
          return true;
        }
      }

      return false;
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
      supportsWidget: platform === 'android',
      supportsShortcut: platform === 'android' || platform === 'ios',
      platform
    };
  }

  async showWidgetInstructions(): Promise<void> {
    const { supportsWidget, supportsShortcut, platform } = await this.checkWidgetSupport();
    
    if (platform === 'android') {
      // Show Android-specific instructions
      await LocalNotifications.schedule({
        id: 'widget-instructions',
        title: 'Add Calendar Widget',
        body: 'Long press on your home screen > Widgets > Search for "Diamond Link Calendar" > Add to Home Screen',
        scheduleTime: new Date(Date.now() + 1000),
        sound: 'default',
        largeIcon: 'calendar_icon',
        actionTypeId: 'widget_instructions'
      });
    } else if (platform === 'ios') {
      // Show iOS-specific instructions
      await LocalNotifications.schedule({
        id: 'widget-instructions',
        title: 'Add Calendar to Today View',
        body: 'Open Calendar > Tap "..." > Add to Today View for quick access',
        scheduleTime: new Date(Date.now() + 1000),
        sound: 'default',
        largeIcon: 'calendar_icon',
        actionTypeId: 'widget_instructions'
      });
    }
  }
}
