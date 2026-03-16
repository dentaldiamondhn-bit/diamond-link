import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, title, messages, agent, createdAt } = await request.json();

    if (!conversationId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid conversation data' }, { status: 400 });
    }

    // In a real implementation, you'd save this to a database
    // For now, we'll use localStorage on the client side
    // This endpoint just validates and formats the data
    
    const conversation = {
      id: conversationId,
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      messages,
      agent: agent || 'tech-support',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      conversation,
      message: 'Conversation saved successfully'
    });

  } catch (error: any) {
    console.error('Save conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // In a real implementation, you'd fetch from a database
    // For now, return structure info
    return NextResponse.json({
      message: 'Claude Chat Conversation API',
      endpoints: {
        POST: '/api/conversations/save',
        GET: '/api/conversations',
        DELETE: '/api/conversations/:id'
      },
      storage: 'localStorage (client-side)',
      features: ['Save conversations', 'Load conversations', 'Delete conversations', 'Auto-save']
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
