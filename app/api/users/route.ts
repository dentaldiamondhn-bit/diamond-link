import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/backend';

export async function GET(request: NextRequest) {
  try {
    // Initialize Clerk Admin API
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Fetch all users using Clerk Admin API
    const userList = await clerk.users.getUserList({
      limit: 100,
      orderBy: '-created_at',
    });

    console.log('Clerk users response:', userList);

    if (!userList || !userList.data) {
      console.error('No users found or invalid response');
      return NextResponse.json([]);
    }

    // Transform Clerk user data to match our interface
    const transformedUsers = userList.data.map((user: any) => ({
      id: user.id,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      email: user.emailAddresses?.[0]?.emailAddress || '',
      role: user.publicMetadata?.role || user.privateMetadata?.role || 'staff',
      profileImageUrl: user.profileImageUrl || user.imageUrl || null
    }));

    console.log('Transformed users:', transformedUsers);
    console.log('Total users found:', transformedUsers.length);

    return NextResponse.json(transformedUsers);
  } catch (error: any) {
    console.error('Error fetching users from Clerk:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || error },
      { status: 500 }
    );
  }
}
