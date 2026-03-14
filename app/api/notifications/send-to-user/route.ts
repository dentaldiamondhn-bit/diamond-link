import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Use service role to bypass authentication for sending notifications to any user
    const supabase = await createClient();
    
    const { userId, notification } = await request.json();
    
    if (!userId || !notification) {
      return NextResponse.json({ error: 'userId and notification are required' }, { status: 400 });
    }
    
    console.log(`📢 Creating notification for user ${userId}:`, notification);
    
    // Store notification in database for the target user
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'general',
        read: false,
        metadata: notification.metadata || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing notification in database:', error);
      // Fallback to in-memory if database fails
      const fallbackNotification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        userId: userId,
        ...notification
      };
      console.log(`📢 Fallback: Notification created for user ${userId}:`, fallbackNotification);
      return NextResponse.json(fallbackNotification);
    }

    console.log(`✅ Notification stored in database for user ${userId}:`, data);
    
    // Trigger browser notification immediately
    await triggerBrowserNotification(userId, notification);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

// Function to trigger browser notification for specific user
async function triggerBrowserNotification(userId: string, notification: any) {
  try {
    // Create a comprehensive browser notification
    const notificationOptions = {
      title: notification.title,
      body: notification.message,
      icon: '/Logo.svg',
      badge: '/Logo.svg',
      tag: `calendar-${notification.type}`,
      requireInteraction: true,
      silent: false,
      data: notification.metadata || {}
    };

    // Add timestamp for events/tasks
    if (notification.metadata?.itemTime) {
      (notificationOptions as any).timestamp = new Date(notification.metadata.itemTime).getTime();
    }

    console.log(`🔔 Triggering browser notification for user ${userId}:`, notificationOptions);

    // Create a global notification trigger that clients can listen for
    // This simulates real-time push notification behavior
    global.triggerNotification = {
      userId,
      notification: notificationOptions,
      timestamp: Date.now()
    };

    // For immediate testing, also try to show notification if we're in browser context
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Check if we have permission
      if (Notification.permission === 'granted') {
        // Create notification immediately
        new Notification(notificationOptions.title, notificationOptions);
        console.log(`✅ Immediate browser notification sent to user ${userId}`);
      } else if (Notification.permission === 'default') {
        // Request permission and then send
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(notificationOptions.title, notificationOptions);
          console.log(`✅ Browser notification sent after permission grant to user ${userId}`);
        }
      }
    }

  } catch (error) {
    console.error('Error triggering browser notification:', error);
  }
}

// Export function to get notifications for specific user (for testing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    const userNotifications = notifications.filter(n => n.userId === userId);
    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications for user:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
