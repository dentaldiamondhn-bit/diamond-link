import { NextRequest, NextResponse } from 'next/server';

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt for AI assistant
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
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { configured: false, error: 'GROQ_API_KEY is not configured' },
        { status: 200 }
      );
    }
    
    return NextResponse.json({ configured: true, service: 'Groq (Free)' });
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
    const { message, context = {}, model = 'llama-3.1-8b-instant' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Build messages array with system prompt
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `${message}

${Object.keys(context).length > 0 ? `\nAdditional Context:\n${JSON.stringify(context, null, 2)}` : ''}`
      }
    ];

    // Make request to Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Groq API error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to get response from AI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      message: data.choices?.[0]?.message?.content || 'No response generated',
      usage: data.usage,
      model: model,
      service: 'Groq (Free)'
    });

  } catch (error) {
    console.error('Groq API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
