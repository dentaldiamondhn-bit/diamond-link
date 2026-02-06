import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use the Clerk REST API directly
    const response = await fetch(`https://api.clerk.dev/v1/users?limit=100`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Clerk API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const users = data.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      emailAddress: user.email_addresses[0]?.email_address,
      imageUrl: user.image_url,
      publicMetadata: user.public_metadata
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}
