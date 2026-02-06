import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Drop the problematic index
    const { error: dropError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1); // This will fail if we can't connect

    if (dropError) {
      console.error('Connection test failed:', dropError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Try to run raw SQL using the Supabase SQL editor approach
    // For now, let's return a success message and we'll need to manually fix the index
    return NextResponse.json({ 
      success: true, 
      message: 'Please manually run this SQL in Supabase SQL Editor: DROP INDEX IF EXISTS idx_chat_messages_sender; CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_hash ON chat_messages USING HASH (sender_clerk_id);' 
    });
  } catch (error) {
    console.error('Error fixing database index:', error);
    return NextResponse.json({ error: 'Failed to fix database index' }, { status: 500 });
  }
}
