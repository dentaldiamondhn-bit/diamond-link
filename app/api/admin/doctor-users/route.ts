import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Doctor users GET request received');
    
    const { userId } = await auth();
    console.log('API: Auth userId:', userId);
    
    if (!userId) {
      console.log('API: No userId found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    try {
      const client = await clerkClient();
      const currentUser = await client.users.getUser(userId);
      console.log('API: Current user:', currentUser);
      const userRole = currentUser.publicMetadata?.role;
      console.log('API: User role:', userRole);

      if (userRole !== 'admin') {
        console.log('API: User is not admin, returning 403');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Get all users
      console.log('API: Fetching user list...');
      const userList = await client.users.getUserList({
        limit: 100,
        orderBy: '-created_at'
      });
      console.log('API: User list fetched:', userList.data.length, 'users');

      // Filter only users with 'doctor' role
      const doctorUsers = userList.data
        .filter((user: any) => user.publicMetadata?.role === 'doctor')
        .map((user: any) => {
          console.log('Processing user:', {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            imageUrl: user.imageUrl,
            hasImage: !!user.profileImageUrl,
            hasImageUrl: !!user.imageUrl,
            fullUserKeys: Object.keys(user),
            profileImageField: user.profileImageUrl || 'MISSING'
          });
          
          return {
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            emailAddress: user.emailAddresses[0]?.emailAddress || '',
            role: user.publicMetadata?.role || 'staff',
            profileImageUrl: user.profileImageUrl || user.imageUrl || `https://img.clerk.com/avatars/${user.id}`,
          };
        });

      console.log('API: Doctor users filtered:', doctorUsers.length, 'users');
      return NextResponse.json({ 
        users: doctorUsers
      });
    } catch (clerkError) {
      console.error('API: Clerk error:', clerkError);
      return NextResponse.json({ error: 'Clerk API error', details: clerkError instanceof Error ? clerkError.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('API: General error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
