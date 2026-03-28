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

    // Drop foreign key constraints that reference users table
    // Since users are managed in Clerk, not Supabase
    const { error: dropCreatorError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_creator;'
    });

    if (dropCreatorError) {
      console.error('Error dropping fk_tickets_creator:', dropCreatorError);
    }

    const { error: dropAssigneeError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_assignee;'
    });

    if (dropAssigneeError) {
      console.error('Error dropping fk_tickets_assignee:', dropAssigneeError);
    }

    const { error: dropActivityError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE ticket_activities DROP CONSTRAINT IF EXISTS fk_ticket_activities_user;'
    });

    if (dropActivityError) {
      console.error('Error dropping fk_ticket_activities_user:', dropActivityError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Foreign key constraints dropped successfully'
    });

  } catch (error) {
    console.error('Error fixing foreign key constraints:', error);
    return NextResponse.json({ 
      error: 'Failed to fix foreign key constraints' 
    }, { status: 500 });
  }
}
