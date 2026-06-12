import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if Odysseus is running
    const response = await fetch('http://localhost:7000', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const configured = response.ok;

    return NextResponse.json({ configured });
  } catch (error) {
    console.error('Odysseus health check failed:', error);
    return NextResponse.json({ configured: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Call Odysseus API
    const odysseusResponse = await fetch('http://localhost:7000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context: context || {},
      }),
    });

    if (!odysseusResponse.ok) {
      const errorData = await odysseusResponse.text();
      console.error('Odysseus API error:', errorData);
      throw new Error(`Odysseus API returned ${odysseusResponse.status}: ${errorData}`);
    }

    const data = await odysseusResponse.json();

    return NextResponse.json({
      message: data.response || data.message || data.content || 'No response from Odysseus',
    });
  } catch (error) {
    console.error('Error calling Odysseus:', error);
    return NextResponse.json(
      { error: 'Failed to get response from Odysseus', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
