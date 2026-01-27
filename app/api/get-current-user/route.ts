import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user with full metadata from Clerk
    const user = await currentUser();
    
    return NextResponse.json({
      userId,
      user: user,
      publicMetadata: user?.publicMetadata,
      privateMetadata: user?.privateMetadata,
      unsafeMetadata: user?.unsafeMetadata,
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
