import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST() {
  try {
    // Check if tables exist
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['conversations', 'conversation_participants', 'conversation_messages', 'chat_rooms']);

    if (tableError) {
      return NextResponse.json({ 
        success: false, 
        error: tableError.message 
      }, { status: 500 });
    }

    const existingTables = tableCheck?.map(t => t.table_name) || [];
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tables check completed',
      existingTables,
      hint: existingTables.length === 0 ? 'No chat tables found. You need to run the SQL migrations from database/migrations/' : undefined
    });

  } catch (error) {
    console.error('Error checking tables:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to check available chat tables',
    method: 'POST'
  });
}
