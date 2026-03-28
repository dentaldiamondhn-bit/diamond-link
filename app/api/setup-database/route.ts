import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    // Use service role key for admin operations
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Test if tables exist and create them if needed
    const { error: convError } = await serviceClient.from('conversations').select('*').limit(1);
    const { error: msgError } = await serviceClient.from('messages').select('*').limit(1);

    const tablesCreated = [];
    
    if (convError && convError.code === 'PGRST116') {
      tablesCreated.push('conversations');
    }
    
    if (msgError && msgError.code === 'PGRST116') {
      tablesCreated.push('messages');
    }

    if (tablesCreated.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: `Tables need to be created manually: ${tablesCreated.join(', ')}`,
        tables: tablesCreated,
        sqlFile: '/database/setup-chat-tables.sql'
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All tables exist and are accessible' 
    });

  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: 'Failed to check database', details: error },
      { status: 500 }
    );
  }
}
