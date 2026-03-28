import { NextRequest, NextResponse } from 'next/server';

// Local AI model configuration
const LOCAL_AI_URL = 'http://localhost:11434/api/chat'; // Ollama default
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
    // Check if Ollama service is running by checking the tags endpoint
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      const hasModels = data.models && data.models.length > 0;
      return NextResponse.json({ 
        configured: hasModels, 
        service: 'Local AI (Ollama)',
        models: data.models?.map(m => m.name) || []
      });
    } else {
      return NextResponse.json(
        { configured: false, error: 'Ollama service not running' },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { configured: false, error: 'Failed to connect to Ollama service' },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context = {}, model = 'llama3.2:latest' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
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

    // Make request to local AI service
    const response = await fetch(LOCAL_AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Local AI error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from local AI: ' + error },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Local AI response:', data);
    
    // Handle Ollama's response format
    const messageContent = data.message?.content || data.response || 'No response generated';
    
    return NextResponse.json({
      message: messageContent,
      model: model,
      service: 'Local AI (Ollama)'
    });

  } catch (error) {
    console.error('Local AI route error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
