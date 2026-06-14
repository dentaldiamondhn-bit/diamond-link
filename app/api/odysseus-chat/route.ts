import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ODYSSEUS_BASE_URL = process.env.ODYSSEUS_BASE_URL || 'http://localhost:7000';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const headers: Record<string, string> = {};

    const response = await fetch(ODYSSEUS_BASE_URL, {
      method: 'GET',
      signal: controller.signal,
      headers,
    }).finally(() => clearTimeout(timeoutId));

    const configured = response.status !== 401 && response.status !== 404 && response.status < 500;

    return NextResponse.json({ 
      configured,
      status: response.status,
      url: ODYSSEUS_BASE_URL
    });
  } catch (error) {
    console.error('Odysseus health check failed:', error);
    return NextResponse.json({ 
      configured: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Ensure Odysseus server is running at ' + ODYSSEUS_BASE_URL
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, context, odysseusConfig } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const baseUrl = odysseusConfig?.baseUrl || ODYSSEUS_BASE_URL;
    const username = odysseusConfig?.username;
    const password = odysseusConfig?.password;
    const customChatEndpoint = odysseusConfig?.chatEndpoint;

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (username && password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    // Odysseus uses /api/chat (not /api/v1/chat/completions)
    const chatEndpointUrls = customChatEndpoint 
      ? [customChatEndpoint.startsWith('/') ? `${baseUrl}${customChatEndpoint}` : customChatEndpoint]
      : [
          `${baseUrl}/api/chat`,
          `${baseUrl}/api/v1/chat/completions`,
          `${baseUrl}/v1/chat/completions`,
        ];

    let odysseusResponse: Response | null = null;
    let lastError: string | null = null;

    for (const chatUrl of chatEndpointUrls) {
      try {
        odysseusResponse = await fetch(chatUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message,
            context: context || {},
          }),
        });

        if (odysseusResponse.ok) {
          break;
        }
        lastError = await odysseusResponse.text();
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    if (!odysseusResponse || !odysseusResponse.ok) {
      console.error('Odysseus API error:', {
        status: odysseusResponse?.status || 'no response',
        lastError,
        triedUrls: chatEndpointUrls
      });
      throw new Error(`Odysseus API returned ${odysseusResponse?.status || 'no response'}: ${lastError || 'Unknown error'}`);
    }

    const data = await odysseusResponse.json();

    return NextResponse.json({
      message: data.response || data.choices?.[0]?.message?.content || data.message || data.content || 'No response from Odysseus',
    });
  } catch (error) {
    console.error('Error calling Odysseus:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get response from Odysseus', 
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Verify Odysseus server URL and credentials.'
      },
      { status: 500 }
    );
  }
}