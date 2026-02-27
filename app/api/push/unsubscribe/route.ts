import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // In a real implementation, you would remove this from the database
    console.log('📱 Push subscription removed:', subscription);
    
    // TODO: Remove from database
    // const supabase = await createClient();
    // await supabase.from('push_subscriptions')
    //   .delete()
    //   .eq('endpoint', subscription.endpoint);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription removed successfully' 
    });
  } catch (error) {
    console.error('❌ Error removing push subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to remove subscription' 
    }, { status: 500 });
  }
}
