import { NextRequest, NextResponse } from 'next/server';

// Google Gemini API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateContent';

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
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { configured: false, error: 'GEMINI_API_KEY is not configured' },
        { status: 200 }
      );
    }
    
    return NextResponse.json({ configured: true, service: 'Google Gemini (Free)' });
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
    const { message, context = {} } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Build prompt with system context
    const fullPrompt = `${SYSTEM_PROMPT}

User Question: ${message}

${Object.keys(context).length > 0 ? `\nAdditional Context:\n${JSON.stringify(context, null, 2)}` : ''}

Please provide a helpful response.`;

    // Make request to Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to get response from AI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      message: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated',
      usage: data.usageMetadata,
      model: 'gemini-pro',
      service: 'Google Gemini (Free)'
    });

  } catch (error) {
    console.error('Gemini API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
