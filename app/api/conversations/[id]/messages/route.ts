import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/services/conversation.service';
import { auth } from '@clerk/nextjs/server';

// GET /api/conversations/[id]/messages - Get all messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = await conversationService.getMessages(params.id, userId);
    
    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Add a message to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const message = await conversationService.addMessage(params.id, {
      role: body.role,
      content: body.content,
      model: body.model,
    });
    
    return NextResponse.json({
      success: true,
      data: message,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { error: 'Failed to add message', message: (error as Error).message },
      { status: 500 }
    );
  }
}
