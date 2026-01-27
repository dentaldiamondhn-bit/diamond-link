import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Testing Clerk client initialization...');
    
    // Test if we can initialize clerkClient
    const client = await clerkClient();
    console.log('Clerk client initialized successfully');
    
    // Test if we can get user list (this requires CLERK_SECRET_KEY)
    const userList = await client.users.getUserList({ limit: 1 });
    console.log('Clerk user list fetched successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Clerk client is working correctly',
      userCount: userList.totalCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Clerk client test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Clerk client failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
