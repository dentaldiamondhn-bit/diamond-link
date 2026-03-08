import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or tech-support
    try {
      const client = await clerkClient();
      const currentUser = await client.users.getUser(userId);
      const userRole = currentUser.publicMetadata?.role;

      if (!['admin', 'tech_support', 'tech-support'].includes(userRole as string)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Get all users
      const userList = await client.users.getUserList({
        limit: 100,
        orderBy: '-created_at'
      });

      // Filter only users with 'doctor' role
      const doctorUsers = userList.data
        .filter((user: any) => user.publicMetadata?.role === 'doctor')
        .map((user: any) => {
          
          return {
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            emailAddress: user.emailAddresses[0]?.emailAddress || '',
            role: user.publicMetadata?.role || 'staff',
            profileImageUrl: user.profileImageUrl || user.imageUrl || `https://img.clerk.com/avatars/${user.id}`,
          };
        });

      return NextResponse.json({ 
        users: doctorUsers
      });
    } catch (clerkError) {
      return NextResponse.json({ error: 'Clerk API error', details: clerkError instanceof Error ? clerkError.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
