import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/services/conversation.service';
import { auth } from '@clerk/nextjs/server';

// GET /api/conversations/[id] - Get a specific conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversation = await conversationService.getConversationById(params.id, userId);
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/conversations/[id] - Update a conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const conversation = await conversationService.updateConversation(params.id, userId, body);
    
    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await conversationService.deleteConversation(params.id, userId);
    
    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation', message: (error as Error).message },
      { status: 500 }
    );
  }
}
