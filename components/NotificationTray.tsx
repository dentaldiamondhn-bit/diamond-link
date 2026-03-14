'use client';

import React, { useState, useEffect } from 'react';
import { RealtimeNotificationService } from '../services/realtimeNotificationService';
import { useUser } from '@clerk/nextjs';

interface NotificationTrayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationTray: React.FC<NotificationTrayProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Initialize realtime notifications
    RealtimeNotificationService.initializeForUser(user.id);

    // Load existing notifications
    const stored = RealtimeNotificationService.getStoredNotifications();
    setNotifications(stored);

    // Listen for new notifications
    const handleNotificationReceived = (event: any) => {
      setNotifications(prev => [event.detail, ...prev.slice(0, 19)]);
    };

    const handleNotificationsCleared = () => {
      setNotifications([]);
    };

    window.addEventListener('notificationReceived', handleNotificationReceived);
    window.addEventListener('notificationsCleared', handleNotificationsCleared);

    return () => {
      window.removeEventListener('notificationReceived', handleNotificationReceived);
      window.removeEventListener('notificationsCleared', handleNotificationsCleared);
      RealtimeNotificationService.cleanupForUser(user.id);
    };
  }, [user]);

  if (!isOpen) return null;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const clearAll = () => {
    RealtimeNotificationService.clearStoredNotifications();
    setNotifications([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notificaciones
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={clearAll}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Limpiar todo
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex-1 overflow-y-auto p-6">
          {notifications.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No tienes notificaciones
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id || index}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">
                          {notification.type === 'calendar_event' ? '📅' :
                           notification.type === 'calendar_task' ? '📋' : '🔔'}
                        </span>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
