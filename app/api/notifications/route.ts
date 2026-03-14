import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    
    // If user is not authenticated, return empty array instead of error
    if (!userId) {
      return NextResponse.json([]);
    }
    
    // Fetch notifications from database for the authenticated user
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications from database:', error);
      return NextResponse.json([], { status: 500 });
    }

    console.log(`📋 Retrieved ${data?.length || 0} notifications for user ${userId}`);
    return NextResponse.json(data || []);
    
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
