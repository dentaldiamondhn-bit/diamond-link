import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// In-memory storage for demo (in production, use database)
let notifications: any[] = [
  {
    id: 'test-1',
    type: 'system',
    title: 'Notificación de Prueba',
    message: 'Esta es una notificación de prueba para verificar que el sistema funciona.',
    timestamp: new Date().toISOString(),
    read: false,
    userId: 'test-user'
  }
];

export async function GET() {
  try {
    const { userId } = await auth();
    
    // In a real implementation, you would fetch from database
    // For now, return the in-memory notifications
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const notificationData = await request.json();
    
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      userId: userId || 'anonymous',
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
