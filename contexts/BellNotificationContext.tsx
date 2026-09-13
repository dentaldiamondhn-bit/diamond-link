'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface BellNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  metadata?: Record<string, any>;
  userId?: string;
}

interface BellNotificationContextType {
  notifications: BellNotification[];
  unreadCount: number;
  addNotification: (notification: { type?: string; title: string; message: string; metadata?: Record<string, any> }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const BellNotificationContext = createContext<BellNotificationContextType | undefined>(undefined);

export function BellNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const { user } = useUser();
  const userId = user?.id;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  }, [userId]);

  useEffect(() => {
    // Load once on mount (after login). setState only runs after the awaited
    // fetch resolves — never synchronously in the effect body.
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' });
        if (res.ok && !cancelled) {
          setNotifications(await res.json());
        }
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Realtime channel removed: the anon Supabase client cannot read owner-
  // scoped rows (owner RLS requires Clerk JWT → auth.jwt()->>'sub'), so
  // postgres_changes would silently stop firing.  Replace with:
  //   • immediate re-fetch on tab refocus (visibilitychange)
  //   • light polling every 30 s while the tab is visible
  // All insert-side callers (push routes, cron) already call the service-role
  // PATCH/POST, and the bell context re-fetches via the Clerk-gated GET, so
  // the badge stays reasonably current without realtime.
  useEffect(() => {
    if (!userId) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Light poll: only while the tab is visible.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(id);
    };
  }, [userId, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = async (notification: { type?: string; title: string; message: string; metadata?: Record<string, any> }) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });
    } catch (e) {
      console.error('Error adding notification:', e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, action: 'markAsRead' }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      }
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead' }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id, action: 'remove' }),
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error('Error removing notification:', e);
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearAll' }),
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (e) {
      console.error('Error clearing all:', e);
    }
  };

  return (
    <BellNotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll }}
    >
      {children}
    </BellNotificationContext.Provider>
  );
}

export function useBellNotifications() {
  const context = useContext(BellNotificationContext);
  if (!context) throw new Error('useBellNotifications must be used within a BellNotificationProvider');
  return context;
}
