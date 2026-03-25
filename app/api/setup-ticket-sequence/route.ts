import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the highest existing ticket number
    const { data: existingTickets, error: fetchError } = await supabase
      .from('tickets')
      .select('ticket_number')
      .not('ticket_number', 'is', null)
      .order('ticket_number', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing tickets:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch existing tickets',
        details: fetchError.message 
      }, { status: 500 });
    }

    let nextNumber = 1;
    if (existingTickets && existingTickets.length > 0) {
      const lastTicketNumber = existingTickets[0].ticket_number;
      const numericPart = lastTicketNumber.replace('REQ-', '');
      const currentNumber = parseInt(numericPart, 10);
      
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    return NextResponse.json({ 
      message: 'Current ticket numbers analyzed',
      lastTicketNumber: existingTickets?.[0]?.ticket_number || 'None found',
      nextNumber: nextNumber,
      sqlToRun: `
-- Set up the sequence with correct starting value
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START ${nextNumber};

-- Create the function to generate next ticket number
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_ticket_number() TO authenticated;

-- Test the function
SELECT get_next_ticket_number();
      `.trim(),
      success: true 
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze ticket numbers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
