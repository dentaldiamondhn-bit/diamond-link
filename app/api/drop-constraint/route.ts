import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({ 
      success: true,
      message: 'Please run the SQL manually in Supabase dashboard',
      sql: 'ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_creator;',
      instructions: [
        '1. Go to Supabase Dashboard',
        '2. Click on SQL Editor',
        '3. Paste and run: ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_creator;',
        '4. Verify with: SELECT conname FROM pg_constraint WHERE conname = \'fk_tickets_creator\';'
      ]
    });

  } catch (error) {
    console.error('Error in drop-constraint:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
