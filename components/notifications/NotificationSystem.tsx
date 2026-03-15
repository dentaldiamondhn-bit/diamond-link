'use client';

import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

// ECC Pattern: Mobile-optimized notification system with performance monitoring
export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // ECC Pattern: Monitor network status for mobile optimization
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ECC Pattern: Optimized notification addition with performance tracking
  const addNotification = useCallback((
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    options: { autoClose?: boolean; duration?: number } = {}
  ) => {
    const startTime = performance.now();
    
    const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // ECC: More unique ID
      title: title.substring(0, 100), // ECC: Limit title length for mobile
      message: message.substring(0, 200), // ECC: Limit message length for mobile
      type,
      timestamp: new Date(),
      autoClose: options.autoClose !== false, // Default to true for mobile
      duration: options.duration || (isOnline ? 5000 : 8000) // ECC: Longer duration offline
    };

    setNotifications(prev => {
      // ECC Pattern: Limit notifications to prevent memory issues on mobile
      const updated = [notification, ...prev].slice(0, 5);
      
      // ECC Pattern: Performance monitoring
      const endTime = performance.now();
      console.log(`ECC: Notification added in ${endTime - startTime}ms, total: ${updated.length}`);
      
      return updated;
    });

    return notification.id;
  }, [isOnline]);

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Auto-close notification if enabled
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.autoClose) {
        setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);
      }
    });
  }, [notifications, removeNotification]);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Expose notification functions to window for global use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addNotification = addNotification;
      (window as any).removeNotification = removeNotification;
      (window as any).clearNotifications = clearNotifications;
    }
  }, [addNotification, removeNotification, clearNotifications]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-500 text-red-900'
              : notification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-500 text-yellow-900'
              : notification.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-900'
              : 'bg-blue-50 border-blue-500 text-blue-900'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-sm mt-1 opacity-90">{notification.message}</p>
              <p className="text-xs mt-2 opacity-70">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      
      {notifications.length > 0 && (
        <button
          onClick={clearNotifications}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Limpiar todas
        </button>
      )}
    </div>
  );
}
