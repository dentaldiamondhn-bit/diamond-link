'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { googleCalendarService } from '@/services/googleCalendar';
import { format, isToday, isTomorrow, addMinutes, differenceInMinutes } from 'date-fns';

interface NotificationSettings {
  enabled: boolean;
  eventsStartingSoon: boolean;
  dailySummary: boolean;
  tomorrowReminder: boolean;
  soundEnabled: boolean;
}

export function BrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    eventsStartingSoon: true,
    dailySummary: true,
    tomorrowReminder: true,
    soundEnabled: true,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotifiedEvents, setLastNotifiedEvents] = useState<Set<string>>(new Set());

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  }, []);

  // Show browser notification
  const showNotification = useCallback((
    title: string,
    options: NotificationOptions & { event?: CalendarEvent } = {}
  ) => {
    if (!settings.enabled || permission !== 'granted') return;

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.event?.id || 'general',
      requireInteraction: options.requireInteraction || false,
      ...options,
    });

    // Play sound if enabled
    if (settings.soundEnabled) {
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(() => {
        // Ignore audio play errors
      });
    }

    // Auto-close after 5 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    return notification;
  }, [permission, settings]);

  // Check for events starting soon
  const checkEventsStartingSoon = useCallback(async () => {
    if (!isConnected || !settings.eventsStartingSoon) return;

    try {
      const events = await googleCalendarService.getEvents();
      const now = new Date();

      events.forEach(event => {
        const eventStart = new Date(event.start);
        const minutesUntilStart = differenceInMinutes(eventStart, now);

        // Notify for events starting in the next 15 minutes
        if (minutesUntilStart > 0 && minutesUntilStart <= 15 && !lastNotifiedEvents.has(event.id)) {
          showNotification('Event Starting Soon', {
            body: `${event.title} starts in ${minutesUntilStart} minutes`,
            event,
            requireInteraction: true,
          });

          setLastNotifiedEvents(prev => new Set(prev).add(event.id));
        }
      });
    } catch (error) {
      console.error('Error checking events starting soon:', error);
    }
  }, [isConnected, settings.eventsStartingSoon, lastNotifiedEvents, showNotification]);

  // Send daily summary
  const sendDailySummary = useCallback(async () => {
    if (!isConnected || !settings.dailySummary) return;

    try {
      const events = await googleCalendarService.getEvents();
      const todayEvents = events.filter(event => isToday(new Date(event.start)));

      if (todayEvents.length > 0) {
        const eventList = todayEvents
          .map(event => `• ${event.title} at ${format(new Date(event.start), 'HH:mm')}`)
          .join('\n');

        showNotification('Daily Calendar Summary', {
          body: `You have ${todayEvents.length} events today:\n${eventList}`,
        });
      }
    } catch (error) {
      console.error('Error sending daily summary:', error);
    }
  }, [isConnected, settings.dailySummary, showNotification]);

  // Send tomorrow reminder
  const sendTomorrowReminder = useCallback(async () => {
    if (!isConnected || !settings.tomorrowReminder) return;

    try {
      const events = await googleCalendarService.getEvents();
      const tomorrowEvents = events.filter(event => isTomorrow(new Date(event.start)));

      if (tomorrowEvents.length > 0) {
        const eventList = tomorrowEvents
          .map(event => `• ${event.title} at ${format(new Date(event.start), 'HH:mm')}`)
          .join('\n');

        showNotification('Tomorrow\'s Schedule', {
          body: `You have ${tomorrowEvents.length} events tomorrow:\n${eventList}`,
        });
      }
    } catch (error) {
      console.error('Error sending tomorrow reminder:', error);
    }
  }, [isConnected, settings.tomorrowReminder, showNotification]);

  // Check Google Calendar connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await googleCalendarService.isConnected();
        setIsConnected(connected);
      } catch (error) {
        console.error('Error checking Google Calendar connection:', error);
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Request permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Set up periodic checks
  useEffect(() => {
    if (!isConnected) return;

    // Check events starting soon every minute
    const eventsInterval = setInterval(checkEventsStartingSoon, 60000);

    // Send daily summary at 8 AM
    const dailyInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        sendDailySummary();
      }
    }, 60000); // Check every minute

    // Send tomorrow reminder at 8 PM
    const tomorrowInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 20 && now.getMinutes() === 0) {
        sendTomorrowReminder();
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(eventsInterval);
      clearInterval(dailyInterval);
      clearInterval(tomorrowInterval);
    };
  }, [isConnected, checkEventsStartingSoon, sendDailySummary, sendTomorrowReminder]);

  // This component doesn't render anything visible
  return null;
}
