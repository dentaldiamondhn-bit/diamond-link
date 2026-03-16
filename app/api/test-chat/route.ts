import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Simple test response
    return NextResponse.json({
      response: `🧪 Test API Response:\n\nYou sent: "${message}"\n\nAPI is working correctly! Time: ${new Date().toLocaleString()}`,
      success: true,
      test: true
    });

  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Claude Chat Test API',
    status: 'working',
    endpoints: {
      POST: '/api/test-chat',
      usage: 'POST { message: string }'
    }
  });
}
