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

    // Check if user is admin
    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    const userRole = currentUser.publicMetadata?.role;

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, firstName, lastName, role, password } = await request.json();

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['admin', 'doctor', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Create new user
    const newUser = await client.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      publicMetadata: {
        role
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully. They will receive an email to complete registration.',
      user: {
        id: newUser.id,
        email: newUser.emailAddresses[0]?.emailAddress,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.publicMetadata?.role
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
