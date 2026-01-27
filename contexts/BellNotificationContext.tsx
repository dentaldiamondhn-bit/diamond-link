'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface BellNotification {
  id: string;
  type: 'event' | 'patient_created' | 'patient_updated' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  metadata?: {
    eventId?: string;
    patientId?: string;
    userId?: string;
    userName?: string;
    patientName?: string;
    eventTitle?: string;
    eventTime?: Date;
  };
}

interface BellNotificationContextType {
  notifications: BellNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<BellNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const BellNotificationContext = createContext<BellNotificationContextType | undefined>(undefined);

export function BellNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<BellNotification[]>([]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = async (notification: Omit<BellNotification, 'id' | 'timestamp' | 'read'>) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });
      
      if (response.ok) {
        const newNotification = await response.json();
        setNotifications(prev => [newNotification, ...prev]);
      } else {
        console.error('Failed to add notification, status:', response.status);
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: id,
          action: 'markAsRead'
        }),
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllAsRead'
        }),
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: id,
          action: 'remove'
        }),
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clearAll'
        }),
      });
      
      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  // Check for upcoming events every minute (disabled for now due to auth issues)
  useEffect(() => {
    const checkUpcomingEvents = async () => {
      try {
        // Disabled for now - Google Calendar API requires auth tokens
        // This would need to be implemented differently for server-side notifications
        console.log('Calendar event notifications disabled - requires client-side auth');
      } catch (error) {
        console.error('Error checking upcoming events:', error);
      }
    };

    // Fetch notifications from server
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.status === 401) {
          console.error('🔔 Authentication failed - user not logged in');
          return;
        }
        
        if (response.ok) {
          const serverNotifications = await response.json();
          // Convert server notifications to client format
          const clientNotifications = serverNotifications.map((notif: any) => ({
            ...notif,
            timestamp: new Date(notif.timestamp)
          }));
          setNotifications(clientNotifications);
        } else {
          const errorText = await response.text();
          console.error('🔔 Failed to fetch notifications, status:', response.status, 'Error:', errorText);
        }
      } catch (error) {
        console.error('❌ Error fetching notifications:', error);
      }
    };

    // Initial fetch
    fetchNotifications();
    
    // Sync with server every 5 seconds for faster updates
    const syncInterval = setInterval(fetchNotifications, 5000);

    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <BellNotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll
    }}>
      {children}
    </BellNotificationContext.Provider>
  );
}

export function useBellNotifications() {
  const context = useContext(BellNotificationContext);
  if (context === undefined) {
    throw new Error('useBellNotifications must be used within a BellNotificationProvider');
  }
  return context;
}
