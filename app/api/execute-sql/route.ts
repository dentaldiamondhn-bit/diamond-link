import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Execute the SQL to drop foreign key constraint
    const { data, error } = await supabase
      .from('tickets')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error accessing tickets:', error);
      return NextResponse.json({ error: 'Database access error' }, { status: 500 });
    }

    // Try to execute raw SQL using a workaround
    const sql = `ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_creator;`;
    
    const { error: sqlError } = await supabase
      .rpc('exec', { sql });

    if (sqlError) {
      console.error('Error executing SQL:', sqlError);
      return NextResponse.json({ error: 'Failed to execute SQL' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Foreign key constraint dropped successfully'
    });

  } catch (error) {
    console.error('Error in fix-foreign-keys:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
