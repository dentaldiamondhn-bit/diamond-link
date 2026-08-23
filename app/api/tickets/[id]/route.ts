import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TicketService } from '@/services/ticketService';
import { UpdateTicketData, ActivityType } from '@/types/ticket';


// GET /api/tickets/[id] - Get single ticket
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await TicketService.getTicketById(id);
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
    }

    if (!result.data) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ ticket: result.data });
  } catch (error) {
    console.error('Get ticket API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tickets/[id] - Update ticket
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates: UpdateTicketData = await request.json();
    
    // Validate at least one field to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const result = await TicketService.updateTicket(id, updates, userId);
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }

    if (!result.data) {
      return NextResponse.json({ error: 'Ticket not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ ticket: result.data });
  } catch (error) {
    console.error('Update ticket API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tickets/[id]/comment - Add comment to ticket
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();
    
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const result = await TicketService.addComment(id, userId, content.trim());
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    return NextResponse.json({ activity: result.data }, { status: 201 });
  } catch (error) {
    console.error('Add comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tickets/[id] - Delete ticket (admin/tech support only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add role check for admin/tech support only
    const result = await TicketService.deleteTicket(id);
    
    if (result.error) {
      return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete ticket API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
