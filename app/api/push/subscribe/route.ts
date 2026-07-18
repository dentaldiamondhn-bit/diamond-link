import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const authResult = await auth();
    const userId = authResult?.userId;
    console.log(`[${requestId}] POST /api/push/subscribe userId:`, userId);

    if (!userId) {
      console.warn(`[${requestId}] No userId from Clerk auth`);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;
    console.log(`[${requestId}] endpoint:`, endpoint?.slice(0, 50) + '...');
    console.log(`[${requestId}] keys present:`, !!(keys?.p256dh && keys?.auth));

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      console.warn(`[${requestId}] Invalid subscription data`);
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'user_id,endpoint' },
    );

    if (error) {
      console.error(`[${requestId}] Supabase upsert error:`, error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    console.log(`[${requestId}] Subscription saved successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[${requestId}] Error saving push subscription:`, error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
