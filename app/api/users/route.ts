import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Error fetching users' },
        { status: 500 }
      );
    }

    // Check if usersData has users array
    if (!usersData || !('users' in usersData) || !Array.isArray(usersData.users)) {
      console.error('Invalid users data structure:', usersData);
      return NextResponse.json([]);
    }

    // Transform the data to match our interface
    const transformedUsers = usersData.users.map((user: any) => ({
      id: user.id,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      email: user.email || '',
      role: user.user_metadata?.role || ''
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Unexpected error in users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
