'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { googleCalendarService } from '@/services/googleCalendar';
import { format, isToday, isTomorrow, addMinutes, differenceInMinutes } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  event?: CalendarEvent;
  autoClose?: boolean;
  duration?: number;
}

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  // Check Google Calendar connection
  const checkConnection = useCallback(async () => {
    try {
      const connected = await googleCalendarService.isConnected();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      return false;
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      autoClose: notification.autoClose !== false,
      duration: notification.duration || 5000,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-close notification if enabled
    if (newNotification.autoClose) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Check for upcoming events and create notifications
  const checkUpcomingEvents = useCallback(async () => {
    try {
      const connected = await checkConnection();
      if (!connected) return;

      const events = await googleCalendarService.getEvents();
      const now = new Date();
      
      // Filter events for today and tomorrow
      const relevantEvents = events.filter(event => {
        const eventStart = new Date(event.start);
        return eventStart >= now && eventStart <= addMinutes(now, 24 * 60); // Next 24 hours
      });

      // Check for events starting soon (within 15 minutes)
      const soonEvents = relevantEvents.filter(event => {
        const eventStart = new Date(event.start);
        const minutesUntil = differenceInMinutes(eventStart, now);
        return minutesUntil > 0 && minutesUntil <= 15;
      });

      // Check for events today
      const todayEvents = relevantEvents.filter(event => 
        isToday(new Date(event.start))
      );

      // Check for events tomorrow
      const tomorrowEvents = relevantEvents.filter(event => 
        isTomorrow(new Date(event.start))
      );

      // Create notifications for events starting soon
      soonEvents.forEach(event => {
        const eventStart = new Date(event.start);
        const minutesUntil = differenceInMinutes(eventStart, now);
        
        addNotification({
          title: 'Próxima cita',
          message: `${event.title} comienza en ${minutesUntil} minuto${minutesUntil === 1 ? '' : 's'}${event.location ? ` en ${event.location}` : ''}`,
          type: 'warning',
          event,
          autoClose: false, // Don't auto-close important reminders
          duration: 10000,
        });
      });

      // Create notification for today's events (only once per day)
      if (todayEvents.length > 0 && now.getHours() === 8 && now.getMinutes() < 5) {
        addNotification({
          title: 'Citas de hoy',
          message: `Tienes ${todayEvents.length} cita${todayEvents.length === 1 ? '' : 's'} programada${todayEvents.length === 1 ? '' : 's'} para hoy`,
          type: 'info',
          autoClose: true,
          duration: 8000,
        });
      }

      // Create notification for tomorrow's events (only once per day)
      if (tomorrowEvents.length > 0 && now.getHours() === 20 && now.getMinutes() < 5) {
        addNotification({
          title: 'Citas de mañana',
          message: `Tienes ${tomorrowEvents.length} cita${tomorrowEvents.length === 1 ? '' : 's'} programada${tomorrowEvents.length === 1 ? '' : 's'} para mañana`,
          type: 'info',
          autoClose: true,
          duration: 8000,
        });
      }

      setUpcomingEvents(relevantEvents);
    } catch (error) {
      console.error('Error checking upcoming events:', error);
    }
  }, [checkConnection, addNotification]);

  // Initialize and set up periodic checks
  useEffect(() => {
    checkConnection();
    checkUpcomingEvents();

    // Check for upcoming events every minute
    const eventCheckInterval = setInterval(checkUpcomingEvents, 60000);

    // Check connection every 5 minutes
    const connectionCheckInterval = setInterval(checkConnection, 300000);

    return () => {
      clearInterval(eventCheckInterval);
      clearInterval(connectionCheckInterval);
    };
  }, [checkConnection, checkUpcomingEvents]);

  // Get notification icon based on type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle text-green-500';
      case 'warning':
        return 'fas fa-exclamation-triangle text-yellow-500';
      case 'error':
        return 'fas fa-times-circle text-red-500';
      case 'info':
      default:
        return 'fas fa-info-circle text-blue-500';
    }
  };

  // Get notification background color based on type
  const getNotificationBg = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700';
      case 'error':
        return 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border shadow-lg transition-all duration-300 transform ${getNotificationBg(notification.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <i className={`text-xl ${getNotificationIcon(notification.type)}`}></i>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {notification.title}
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {notification.message}
              </p>
              {notification.event && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <i className="fas fa-calendar-alt mr-1"></i>
                  {format(new Date(notification.event.start), "PPP 'a las' HH:mm")}
                  {notification.event.location && (
                    <span className="ml-2">
                      <i className="fas fa-map-marker-alt mr-1"></i>
                      {notification.event.location}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {/* Connection status indicator */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className={`flex items-center px-3 py-2 rounded-full text-xs font-medium shadow-lg ${
          isConnected 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          <i className={`fas ${isConnected ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1`}></i>
          {isConnected ? 'Calendario conectado' : 'Calendario desconectado'}
        </div>
      </div>
    </div>
  );
}
