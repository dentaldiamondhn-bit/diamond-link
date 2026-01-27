import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await request.json();

    if (!role || !['admin', 'doctor', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update user metadata in Clerk
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
