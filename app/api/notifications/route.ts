import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// In-memory storage for demo (in production, use database)
let notifications: any[] = [];

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    
    // If user is not authenticated, return empty array instead of error
    if (!userId) {
      return NextResponse.json([]);
    }
    
    // In a real implementation, you would fetch from database
    // For now, return the in-memory notifications filtered by user
    const userNotifications = notifications.filter(n => n.userId === userId || n.userId === 'test-user');
    
    // Also fetch notifications from the send-to-user API storage
    // In a real implementation, this would be a single database query
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send-to-user?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const sentNotifications = await response.json();
        // Merge both notification sources
        const allNotifications = [...userNotifications, ...sentNotifications];
        // Sort by timestamp (newest first)
        allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return NextResponse.json(allNotifications);
      }
    } catch (error) {
      console.error('Error fetching sent notifications:', error);
    }
    
    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // If user is not authenticated, return error
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const notificationData = await request.json();
    
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      userId: userId,
      ...notificationData
    };
    
    notifications.unshift(newNotification);
    
    return NextResponse.json(newNotification);
  } catch (error) {
    console.error('Error adding notification:', error);
    return NextResponse.json({ error: 'Failed to add notification' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // If user is not authenticated, return error
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { notificationId, action } = await request.json();
    
    if (action === 'markAsRead') {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    } else if (action === 'markAllAsRead') {
      notifications = notifications.map(n => ({ ...n, read: true }));
    } else if (action === 'remove') {
      notifications = notifications.filter(n => n.id !== notificationId);
    } else if (action === 'clearAll') {
      notifications = [];
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
