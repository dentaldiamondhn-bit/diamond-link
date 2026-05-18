import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Prevent static generation for this API route
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit') || '10';

    // This would typically fetch from a database
    // For now, returning mock data
    const conversations = [
      {
        id: '1',
        title: 'Sample Conversation',
        lastMessage: 'Hello, how can I help you?',
        timestamp: new Date().toISOString(),
        userId: userId,
      }
    ];

    return NextResponse.json({
      conversations,
      nextCursor: null,
    });
  } catch (error) {
    console.error('Error in GET /api/chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();

    // This would typically save to a database
    // For now, returning mock data
    const newConversation = {
      id: Date.now().toString(),
      title,
      lastMessage: '',
      timestamp: new Date().toISOString(),
      userId: userId,
    };

    return NextResponse.json(newConversation, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}