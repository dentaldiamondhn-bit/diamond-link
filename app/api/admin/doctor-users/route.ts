import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/backend';

// Ensure this API route runs dynamically at request time
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Initialize Clerk client
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get all users
    const userList = await clerk.users.getUserList({
      limit: 100,
      orderBy: '-created_at'
    });

    // Filter only users with 'doctor' role
    const doctorUsers = userList.data
      .filter((user: any) => user.publicMetadata?.role === 'doctor')
      .map((user: any) => ({
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        emailAddress: user.emailAddresses[0]?.emailAddress || '',
        role: user.publicMetadata?.role || 'staff',
        profileImageUrl: user.profileImageUrl || user.imageUrl || `https://img.clerk.com/avatars/${user.id}`,
      }));

    return NextResponse.json({ 
      users: doctorUsers
    });
  } catch (error) {
    console.error('Error fetching doctor users:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
