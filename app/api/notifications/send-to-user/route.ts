import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Server-side identity gate: every sender must hold a live Clerk session.
    // (Phase 5 of the calendario plan will move this behind a service-role /
    // signed webhook path with role-aware recipients.)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { userId: targetUserId, notification } = await request.json();

    if (!targetUserId || !notification) {
      return NextResponse.json({ error: 'userId and notification are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: notification.type || 'system',
        title: notification.title,
        message: notification.message,
        data: notification.metadata || {},
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing notification:', error);
      return NextResponse.json({ error: 'Failed to store notification' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, success: true });
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
