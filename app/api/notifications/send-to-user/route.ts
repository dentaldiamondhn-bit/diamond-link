import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// In-memory storage for demo (in production, use database)
const notifications: any[] = [];

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
    
    // Create notification for specific user
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      userId: userId, // Target user ID
      ...notification
    };
    
    // Store notification in in-memory storage (sync with main notifications storage)
    notifications.unshift(newNotification);
    
    console.log(`📢 Notification created for user ${userId}:`, newNotification);
    
    // Trigger browser notification immediately
    await triggerBrowserNotification(userId, notification);
    
    return NextResponse.json(newNotification);
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

// Function to trigger browser notification for specific user
async function triggerBrowserNotification(userId: string, notification: any) {
  try {
    // Create a server-sent event or WebSocket connection to trigger browser notification
    // For now, we'll use a simple approach by calling a global function if available
    
    // This would typically be handled by WebSocket or SSE
    // For demo purposes, we'll create a simple trigger mechanism
    
    console.log(`🔔 Triggering browser notification for user ${userId}:`, {
      title: notification.title,
      body: notification.message,
      icon: '/Logo.svg',
      badge: '/Logo.svg',
      tag: 'calendar-notification',
      requireInteraction: true,
      data: notification.metadata
    });

    // In a real implementation, you would:
    // 1. Use WebSocket to send to specific client
    // 2. Use Server-Sent Events to push to client
    // 3. Use a notification service like OneSignal
    
    // For now, the client will poll and pick up the notification
    
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
