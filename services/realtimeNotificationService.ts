import { createClient } from '@/lib/supabase/client';

interface RealtimeNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata?: any;
  timestamp: string;
}

export class RealtimeNotificationService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  private static channels: Map<string, any> = new Map();

  // Initialize realtime service for a user
  static async initializeForUser(userId: string) {
    try {
      console.log(`🔔 Initializing realtime notifications for user: ${userId}`);
      
      // Subscribe to user-specific channel
      const channelName = `user_notifications_${userId}`;
      
      if (this.channels.has(channelName)) {
        console.log(`⚠️ Channel ${channelName} already subscribed`);
        return;
      }

      const channel = this.supabase
        .channel(channelName)
        .on('broadcast', { event: 'notification' }, (payload) => {
          console.log(`📡 Received realtime notification for user ${userId}:`, payload);
          
          // Extract notification data from payload
          const notification = payload.payload as RealtimeNotification;
          
          // Trigger browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification(notification.title, {
              body: notification.message,
              icon: '/Logo.svg',
              badge: '/Logo.svg',
              tag: notification.type,
              requireInteraction: true,
              data: notification.metadata
            });
            
            console.log(`✅ Browser notification displayed: ${notification.title}`);
          }
          
          // Store in localStorage for notification tray
          this.storeNotification(notification);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to realtime notifications for user: ${userId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Channel error for user: ${userId}`);
          }
        });

      this.channels.set(channelName, channel);
      
    } catch (error) {
      console.error(`❌ Error initializing realtime for user ${userId}:`, error);
    }
  }

  // Send notification to specific user via realtime
  static async sendNotificationToUser(userId: string, notification: Omit<RealtimeNotification, 'id' | 'timestamp'>) {
    try {
      const channelName = `user_notifications_${userId}`;
      const realtimeNotification: RealtimeNotification = {
        id: Date.now().toString(),
        user_id: userId,
        ...notification,
        timestamp: new Date().toISOString()
      };

      console.log(`📡 Sending realtime notification to user ${userId}:`, realtimeNotification);

      // Send via Supabase Realtime
      const response = await this.supabase
        .channel(channelName)
        .send({
          type: 'broadcast',
          event: 'notification',
          payload: realtimeNotification
        });

      console.log(`✅ Realtime notification sent to user: ${userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error sending realtime notification to ${userId}:`, error);
      return false;
    }
  }

  // Store notification in localStorage for notification tray
  private static storeNotification(notification: RealtimeNotification) {
    try {
      const existing = localStorage.getItem('user_notifications');
      const notifications = existing ? JSON.parse(existing) : [];
      notifications.unshift(notification);
      
      // Keep only last 50 notifications
      const limited = notifications.slice(0, 50);
      localStorage.setItem('user_notifications', JSON.stringify(limited));
      
      // Trigger storage event for notification tray
      window.dispatchEvent(new CustomEvent('notificationReceived', { 
        detail: notification 
      }));
      
    } catch (error) {
      console.error('❌ Error storing notification:', error);
    }
  }

  // Get stored notifications for notification tray
  static getStoredNotifications(): RealtimeNotification[] {
    try {
      const existing = localStorage.getItem('user_notifications');
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('❌ Error getting stored notifications:', error);
      return [];
    }
  }

  // Clear stored notifications
  static clearStoredNotifications() {
    try {
      localStorage.removeItem('user_notifications');
      window.dispatchEvent(new CustomEvent('notificationsCleared'));
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }

  // Cleanup user channels
  static async cleanupForUser(userId: string) {
    try {
      const channelName = `user_notifications_${userId}`;
      const channel = this.channels.get(channelName);
      
      if (channel) {
        await this.supabase.removeChannel(channel);
        this.channels.delete(channelName);
        console.log(`🧹 Cleaned up realtime channel for user: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning up realtime for user ${userId}:`, error);
    }
  }
}
