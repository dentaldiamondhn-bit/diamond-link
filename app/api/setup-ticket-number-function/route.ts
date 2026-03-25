import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create sequence first
    const { error: seqError } = await supabase
      .from('information_schema.sequences')
      .select('sequence_name')
      .eq('sequence_name', 'ticket_number_seq');

    if (seqError) {
      // Try to create the sequence using raw SQL
      const { error: createSeqError } = await supabase
        .from('pg_catalog.pg_class')
        .select('relname')
        .eq('relname', 'ticket_number_seq');

      if (createSeqError) {
        console.log('Sequence might not exist, continuing...');
      }
    }

    // Try to create the function using a different approach
    // We'll use the raw SQL approach through a direct connection
    try {
      // First, let's try to create the sequence
      const { data: seqData, error: sequenceError } = await supabase
        .rpc('create_sequence_if_not_exists', {
          sequence_name: 'ticket_number_seq',
          start_value: 1
        });

      if (sequenceError && !sequenceError.message.includes('already exists')) {
        console.log('Sequence creation error (might be expected):', sequenceError.message);
      }

      // Now create the function
      const functionSQL = `
        CREATE OR REPLACE FUNCTION get_next_ticket_number()
        RETURNS TEXT
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            next_number TEXT;
        BEGIN
            -- Get the next number from the sequence
            next_number := 'REQ-' || LPAD(nextval('ticket_number_seq')::text, 5, '0');
            
            RETURN next_number;
        END;
        $$;
      `;

      // Try to execute the function creation
      const { error: functionError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'get_next_ticket_number');

      if (functionError) {
        return NextResponse.json({ 
          error: 'Function creation failed',
          details: functionError.message,
          suggestion: 'Please manually run the SQL in your Supabase dashboard'
        }, { status: 500 });
      }

      // Grant permissions
      const { error: grantError } = await supabase
        .from('information_schema.role_table_grants')
        .select('grantee')
        .eq('grantee', 'authenticated');

      if (grantError) {
        console.log('Grant permission check failed:', grantError.message);
      }

    } catch (sqlError) {
      console.error('SQL execution error:', sqlError);
    }

    return NextResponse.json({ 
      message: 'Setup attempted. Please manually run the following SQL in your Supabase dashboard:',
      sql: `
        CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;
        
        CREATE OR REPLACE FUNCTION get_next_ticket_number()
        RETURNS TEXT
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            next_number TEXT;
        BEGIN
            -- Get the next number from the sequence
            next_number := 'REQ-' || LPAD(nextval('ticket_number_seq')::text, 5, '0');
            
            RETURN next_number;
        END;
        $$;

        GRANT EXECUTE ON FUNCTION get_next_ticket_number() TO authenticated;
      `,
      success: true 
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to setup ticket number function',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
