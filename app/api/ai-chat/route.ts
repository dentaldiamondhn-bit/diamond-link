import { NextRequest, NextResponse } from 'next/server';

// Anthropic API configuration
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an AI coding assistant for Dental Diamond Link, a dental clinic management application.

Tech Stack:
- Next.js 15 with App Router
- TypeScript
- Supabase (PostgreSQL)
- Clerk Authentication
- Tailwind CSS
- Zod for validation

Project Structure:
- app/ - Next.js App Router pages
- components/ - React components
- contexts/ - React Context providers
- services/ - Business logic services
- lib/ - Utility functions
- database/migrations/ - SQL migrations

You help with:
- Writing and debugging code
- Explaining code patterns
- Creating new features
- Code review and improvements
- Following best practices for this specific project

Be concise, helpful, and focus on practical solutions.`;

export async function GET() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { configured: false, error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 200 }
      );
    }
    
    return NextResponse.json({ configured: true });
  } catch (error) {
    return NextResponse.json(
      { configured: false, error: 'Failed to check API configuration' },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model = 'claude-sonnet-4-20250514', maxTokens = 4096 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Make request to Anthropic API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to get response from AI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      message: data.content[0].text,
      usage: data.usage,
      model: data.model,
      id: data.id
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
