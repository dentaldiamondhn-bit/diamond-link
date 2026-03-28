import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/services/conversation.service';
import { auth } from '@clerk/nextjs/server';

// GET /api/conversations - Get all conversations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await conversationService.getConversations(userId);
    
    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    return NextResponse.json(
      { error: 'Failed to get conversations', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const conversation = await conversationService.createConversation(userId, body);
    
    return NextResponse.json({
      success: true,
      data: conversation,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', message: (error as Error).message },
      { status: 500 }
    );
  }
}
