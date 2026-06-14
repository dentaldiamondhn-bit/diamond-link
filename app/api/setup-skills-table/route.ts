import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Setup skills table
export async function POST(request: NextRequest) {
  try {
    // Allow internal calls without authentication for setup
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    if (!isInternalCall) {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Create skills table if it doesn't exist using direct SQL
    const { error: tableError } = await supabase.rpc('create_skills_table');
    
    if (tableError) {
      console.log('RPC failed, table might already exist or RPC function not created');
      // Try to check if table exists by querying it
      const { error: checkError } = await supabase.from('skills').select('id').limit(1);
      
      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist, create it manually
        console.log('Table does not exist, creating manually');
        return NextResponse.json({ 
          error: 'Table does not exist and could not be created automatically',
          message: 'Please create the skills table manually using SQL',
          sql: `CREATE TABLE skills (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            prompt TEXT NOT NULL,
            category TEXT NOT NULL,
            tags TEXT[] DEFAULT ARRAY[]::TEXT[],
            is_public BOOLEAN DEFAULT false,
            created_by UUID NOT NULL,
            version INTEGER DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE INDEX idx_skills_created_by ON skills(created_by);
          CREATE INDEX idx_skills_category ON skills(category);
          CREATE INDEX idx_skills_is_public ON skills(is_public);
          CREATE INDEX idx_skills_tags ON skills USING GIN(tags);`
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'Skills table setup completed',
      note: 'If the table creation failed, please create it manually using the SQL in the code'
    });
  } catch (error) {
    console.error('Error setting up skills table:', error);
    return NextResponse.json(
      { error: 'Failed to setup skills table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
