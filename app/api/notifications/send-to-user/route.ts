import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, notification } = await request.json();
    
    if (!userId || !notification) {
      return NextResponse.json({ error: 'userId and notification are required' }, { status: 400 });
    }
    
    console.log(`📢 Creating notification for user ${userId}:`, notification);
    
    // Create global notification trigger that will be picked up by NotificationListenerWrapper
    const globalTrigger = {
      userId,
      notification: {
        title: notification.title,
        body: notification.message,
        icon: '/Logo.svg',
        badge: '/Logo.svg',
        tag: `calendar-${notification.type}`,
        requireInteraction: true,
        data: notification.metadata || {}
      },
      timestamp: Date.now()
    };
    
    // Store in global scope for NotificationListenerWrapper to pick up
    (global as any).pendingNotifications = (global as any).pendingNotifications || [];
    (global as any).pendingNotifications.unshift(globalTrigger);
    
    console.log(`✅ Global notification triggered for user ${userId}`);
    
    return NextResponse.json({ success: true, notification: globalTrigger });
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
