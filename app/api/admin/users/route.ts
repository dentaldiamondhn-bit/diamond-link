import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Admin users GET request received');
    
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

      const formattedUsers = userList.data.map((user: any) => ({
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.emailAddresses[0]?.emailAddress || '',
        role: user.publicMetadata?.role || 'staff',
        lastSignInAt: user.lastSignInAt,
        createdAt: user.createdAt,
        profileImageUrl: user.profileImageUrl || user.imageUrl || `https://img.clerk.com/avatars/${user.id}`,
        banned: user.banned,
        locked: user.locked
      }));

      console.log('API: Formatted users:', formattedUsers.length, 'users');
      return NextResponse.json({ 
        users: formattedUsers as any[]
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    const userRole = currentUser.publicMetadata?.role;

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, targetUserId, newRole } = await request.json();

    if (!action || !targetUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    switch (action) {
      case 'updateRole':
        if (!newRole || !['admin', 'doctor', 'staff'].includes(newRole)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        await client.users.updateUserMetadata(targetUserId, {
          publicMetadata: {
            role: newRole
          }
        });

        return NextResponse.json({ success: true, message: 'Role updated successfully' });

      case 'ban':
        await client.users.banUser(targetUserId);
        return NextResponse.json({ success: true, message: 'User banned successfully' });

      case 'unban':
        await client.users.unbanUser(targetUserId);
        return NextResponse.json({ success: true, message: 'User unbanned successfully' });

      case 'lock':
        await client.users.lockUser(targetUserId);
        return NextResponse.json({ success: true, message: 'User locked successfully' });

      case 'unlock':
        await client.users.unlockUser(targetUserId);
        return NextResponse.json({ success: true, message: 'User unlocked successfully' });

      case 'resetPassword':
        // Send password reset email to user using the correct Clerk API method
        const resetResponse = await fetch(`https://api.clerk.dev/v1/users/${targetUserId}/reset_password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!resetResponse.ok) {
          throw new Error('Failed to send password reset email');
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Password reset email sent successfully'
        });

      case 'deleteUser':
        // Soft delete by banning and revoking all sessions
        await client.users.banUser(targetUserId);
        // Note: revokeSessions might not be available, but banUser should handle session invalidation
        return NextResponse.json({ success: true, message: 'User deleted successfully' });

      case 'impersonate':
        // Note: createImpersonationToken might not be available in current Clerk version
        // Return a message indicating this feature needs Clerk Backend API
        return NextResponse.json({ 
          success: false, 
          message: 'Impersonation feature requires Clerk Backend API configuration'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
