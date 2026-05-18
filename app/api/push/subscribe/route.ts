import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // In a real implementation, you would save this to a database
    // For now, we'll just log it
    console.log('📱 Push subscription received:', subscription);
    
    // TODO: Save to database
    // const supabase = await createClient();
    // await supabase.from('push_subscriptions').upsert({
    //   endpoint: subscription.endpoint,
    //   keys: subscription.keys,
    //   user_id: userId, // You'd get this from authentication
    //   created_at: new Date().toISOString()
    // });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription saved successfully' 
    });
  } catch (error) {
    console.error('❌ Error saving push subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to save subscription' 
    }, { status: 500 });
  }
}
