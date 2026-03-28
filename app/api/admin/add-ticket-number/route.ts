import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔧 Adding ticket_number column to tickets table...');

    // Add the column if it doesn't exist
    const { data, error } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20);'
    });

    if (error) {
      console.error('Error adding column:', error);
      return NextResponse.json({ 
        error: 'Failed to add ticket_number column',
        details: error.message 
      }, { status: 500 });
    }

    // Create sequence for ticket numbers
    const { data: seqData, error: seqError } = await supabase.rpc('exec', {
      sql: 'CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;'
    });

    if (seqError) {
      console.error('Error creating sequence:', seqError);
    }

    // Create index
    const { data: indexData, error: indexError } = await supabase.rpc('exec', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);'
    });

    if (indexError) {
      console.error('Error creating index:', indexError);
    }

    // Update existing tickets with numbers
    const { data: updateData, error: updateError } = await supabase.rpc('exec', {
      sql: `UPDATE tickets 
SET ticket_number = 'REQ-' || LPAD(nextval('ticket_number_seq')::text, 5, '0')
WHERE ticket_number IS NULL;`
    });

    if (updateError) {
      console.error('Error updating tickets:', updateError);
    }

    console.log('✅ Ticket number column added successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Ticket number column added successfully',
      details: {
        columnAdded: !error,
        sequenceCreated: !seqError,
        indexCreated: !indexError,
        ticketsUpdated: !updateError
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
