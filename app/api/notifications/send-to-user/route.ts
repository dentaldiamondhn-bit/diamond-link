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
    
    // Create notification for specific user
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      userId: userId, // Target user ID
      ...notification
    };
    
    // Store notification in database (or in-memory for now)
    // In production, you would store this in a proper database table
    console.log(`📢 Notification created for user ${userId}:`, newNotification);
    
    // Trigger browser notification if user is online
    // This would typically be handled by WebSocket or Server-Sent Events
    await triggerBrowserNotification(userId, notification);
    
    return NextResponse.json(newNotification);
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

// Function to trigger browser notification for specific user
async function triggerBrowserNotification(userId: string, notification: any) {
  // In a real implementation, this would use WebSocket or SSE to send to specific client
  // For now, we'll log it and the client-side would poll for new notifications
  console.log(`🔔 Browser notification triggered for user ${userId}:`, {
    title: notification.title,
    body: notification.message,
    icon: '/Logo.svg', // Use the proper logo
    tag: 'calendar-notification',
    requireInteraction: true,
    data: notification.metadata
  });
}
