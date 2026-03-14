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
