import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all tickets ordered by creation date
    const { data: tickets, error: fetchError } = await supabase
      .from('tickets')
      .select('id, ticket_number, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ message: 'No tickets found' });
    }

    // Group tickets by ticket_number to find duplicates
    const ticketGroups: { [key: string]: typeof tickets } = {};
    
    tickets.forEach(ticket => {
      const number = ticket.ticket_number;
      if (!ticketGroups[number]) {
        ticketGroups[number] = [];
      }
      ticketGroups[number].push(ticket);
    });

    // Find duplicates and fix them
    const fixes: any[] = [];
    let currentNumber = 1;

    // Sort all tickets by creation date and reassign numbers
    const sortedTickets = tickets.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const ticket of sortedTickets) {
      const newNumber = `REQ-${currentNumber.toString().padStart(5, '0')}`;
      
      if (ticket.ticket_number !== newNumber) {
        fixes.push({
          id: ticket.id,
          oldNumber: ticket.ticket_number,
          newNumber: newNumber
        });
      }
      
      currentNumber++;
    }

    // Apply the fixes
    if (fixes.length > 0) {
      for (const fix of fixes) {
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ ticket_number: fix.newNumber })
          .eq('id', fix.id);

        if (updateError) {
          console.error(`Error updating ticket ${fix.id}:`, updateError);
        }
      }
    }

    return NextResponse.json({ 
      message: 'Ticket numbers fixed successfully',
      totalTickets: tickets.length,
      fixesApplied: fixes.length,
      fixes: fixes
    });

  } catch (error) {
    console.error('Fix ticket numbers error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix ticket numbers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
