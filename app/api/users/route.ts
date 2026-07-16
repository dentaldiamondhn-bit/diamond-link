import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/backend';

export async function GET(request: NextRequest) {
  try {
    // Get the ID from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    // Initialize Clerk Admin API
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    let userList;
    
    if (userId) {
      // Fetch specific user by ID
      const user = await clerk.users.getUser(userId);
      if (!user) {
        console.error('User not found:', userId);
        return NextResponse.json(null);
      }
      
      // Transform single user data
      const transformedUser = {
        id: user.id,
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        email: user.emailAddresses?.[0]?.emailAddress || '',
        role: user.publicMetadata?.role || user.privateMetadata?.role || 'staff',
        profileImageUrl: user.imageUrl || null
      };
      
      console.log('Transformed user:', transformedUser);
      return NextResponse.json(transformedUser);
    } else {
      // Fetch all users using Clerk Admin API
      userList = await clerk.users.getUserList({
        limit: 100,
        orderBy: '-created_at',
      });
    }

    console.log('Clerk users response:', userList);

    if (!userList) {
      console.error('No users found or invalid response');
      return NextResponse.json([]);
    }

    // Transform Clerk user data to match our interface
    const transformedUsers = Array.isArray(userList.data) 
      ? userList.data.map((user: any) => ({
          id: user.id,
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.emailAddresses?.[0]?.emailAddress || '',
          role: user.publicMetadata?.role || user.privateMetadata?.role || 'STAFF',
          department: user.publicMetadata?.department || user.privateMetadata?.department || '',
          profileImageUrl: user.imageUrl || null,
          created_at: user.createdAt || new Date().toISOString(),
          updated_at: user.updatedAt || new Date().toISOString()
        }))
      : [{
          id: userList.id,
          first_name: userList.firstName || '',
          last_name: userList.lastName || '',
          name: `${userList.firstName || ''} ${userList.lastName || ''}`.trim(),
          email: userList.emailAddresses?.[0]?.emailAddress || '',
          role: userList.publicMetadata?.role || userList.privateMetadata?.role || 'STAFF',
          department: userList.publicMetadata?.department || userList.privateMetadata?.department || '',
          profileImageUrl: userList.imageUrl || null,
          created_at: userList.createdAt || new Date().toISOString(),
          updated_at: userList.updatedAt || new Date().toISOString()
        }]; // Single user case

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
