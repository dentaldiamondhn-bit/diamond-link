import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/backend';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Initialize Clerk client
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const { userId, role } = await request.json();

    if (!userId || !role || !['admin', 'doctor', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Update user metadata in Clerk
    await clerk.users.updateUserMetadata(userId, {
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
