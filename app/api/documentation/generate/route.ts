import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const supabase = createClient();

// POST /api/documentation/generate - Generate documentation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { type, context, odysseusConfig } = body;
    
    if (!type) {
      return NextResponse.json(
        { error: 'Documentation type is required' },
        { status: 400 }
      );
    }

    // Generate documentation based on type
    let documentation;
    
    switch (type) {
      case 'api':
        documentation = await generateAPIDocumentation();
        break;
      case 'user_guide':
        documentation = await generateUserGuide(context);
        break;
      case 'technical':
        documentation = await generateTechnicalDocumentation(context);
        break;
      case 'custom':
        documentation = await generateCustomDocumentation(context, odysseusConfig);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown documentation type: ${type}` },
          { status: 400 }
        );
    }

    // Save generated documentation
    const { data, error } = await supabase
      .from('generated_documentation')
      .insert([{
        type,
        content: documentation,
        context: context || {},
        created_by: userId,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      documentation,
      id: data.id 
    });
  } catch (error) {
    console.error('Error generating documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate documentation' },
      { status: 500 }
    );
  }
}

async function generateAPIDocumentation(): Promise<string> {
  // Scan API routes and generate documentation
  const apiRoutes = [
    '/api/odysseus-chat',
    '/api/odysseus-tools',
    '/api/skills',
    '/api/webhooks',
    '/api/workflows',
    '/api/doctors',
    '/api/patients',
    '/api/treatments',
    '/api/payments',
    '/api/presupuestos',
    '/api/tickets',
    '/api/timeline-notes',
  ];

  let documentation = `# Diamond-Link API Documentation\n\n`;
  documentation += `Generated automatically on ${new Date().toLocaleDateString()}\n\n`;
  documentation += `## Overview\n\n`;
  documentation += `This document provides an overview of the Diamond-Link API endpoints.\n\n`;
  documentation += `## Authentication\n\n`;
  documentation += `Most endpoints require authentication via Clerk. Include your session cookie in requests.\n\n`;
  documentation += `## API Endpoints\n\n`;

  for (const route of apiRoutes) {
    documentation += `### ${route}\n\n`;
    documentation += `- **Methods**: GET, POST, PUT, DELETE (varies by endpoint)\n`;
    documentation += `- **Authentication**: Required\n`;
    documentation += `- **Description**: Diamond-Link ${route.split('/').pop()} management\n\n`;
  }

  documentation += `## Custom Tools\n\n`;
  documentation += `The system includes custom tools for:\n`;
  documentation += `- Patient management and odontogram queries\n`;
  documentation += `- Treatment management\n`;
  documentation += `- Payment processing\n`;
  documentation += `- Report generation\n`;
  documentation += `- Doctor performance analysis\n`;
  documentation += `- Quote/budget management\n`;
  documentation += `- Timeline notes\n`;
  documentation += `- Ticket management\n\n`;

  return documentation;
}

async function generateUserGuide(context?: any): Promise<string> {
  let documentation = `# Diamond-Link User Guide\n\n`;
  documentation += `Generated automatically on ${new Date().toLocaleDateString()}\n\n`;
  documentation += `## Getting Started\n\n`;
  documentation += `Diamond-Link is a comprehensive dental practice management system.\n\n`;
  documentation += `## Key Features\n\n`;
  documentation += `### Patient Management\n`;
  documentation += `- Search and manage patient records\n`;
  documentation += `- View odontograms and dental history\n`;
  documentation += `- Track treatments and payments\n\n`;
  documentation += `### Treatment Planning\n`;
  documentation += `- Create treatment plans\n`;
  documentation += `- Generate quotes and estimates\n`;
  documentation += `- Track treatment progress\n\n`;
  documentation += `### AI Integration\n`;
  documentation += `- Use Odysseus AI for intelligent assistance\n`;
  documentation += `- Select skills for specialized tasks\n`;
  documentation += `- Enable agent mode for complex operations\n\n`;
  documentation += `### Automation\n`;
  documentation += `- Configure webhooks for event notifications\n`;
  documentation += `- Create automated workflows\n`;
  documentation += `- Use custom tools for data operations\n\n`;

  return documentation;
}

async function generateTechnicalDocumentation(context?: any): Promise<string> {
  let documentation = `# Diamond-Link Technical Documentation\n\n`;
  documentation += `Generated automatically on ${new Date().toLocaleDateString()}\n\n`;
  documentation += `## Architecture\n\n`;
  documentation += `Diamond-Link is built with:\n`;
  documentation += `- **Frontend**: Next.js with TypeScript\n`;
  documentation += `- **Backend**: Next.js API routes\n`;
  documentation += `- **Database**: Supabase (PostgreSQL)\n`;
  documentation += `- **Authentication**: Clerk\n`;
  documentation += `- **AI**: Odysseus AI integration\n\n`;
  documentation += `## Key Components\n\n`;
  documentation += `### API Routes\n`;
  documentation += `- Located in /app/api/\n`;
  documentation += `- RESTful design with proper error handling\n`;
  documentation += `- Authentication middleware via Clerk\n\n`;
  documentation += `### Services\n`;
  documentation += `- Business logic in /services/\n`;
  documentation += `- Database operations via Supabase client\n`;
  documentation += `- Type-safe interfaces for data models\n\n`;
  documentation += `### AI Integration\n`;
  documentation += `- Odysseus AI chat interface\n`;
  documentation += `- Custom tools for database operations\n`;
  documentation += `- Skills management for specialized tasks\n`;
  documentation += `- Agent mode for complex workflows\n\n`;
  documentation += `### Automation\n`;
  documentation += `- Webhook system for event-driven automation\n`;
  documentation += `- Workflow engine for multi-step processes\n`;
  documentation += `- Custom tool execution framework\n\n`;

  return documentation;
}

async function generateCustomDocumentation(context?: any, odysseusConfig?: any): Promise<string> {
  // Use Odysseus AI to generate custom documentation
  if (!odysseusConfig) {
    return 'Error: Odysseus configuration required for custom documentation generation';
  }

  const prompt = `Generate documentation for the following context:\n\n${JSON.stringify(context, null, 2)}\n\nPlease provide comprehensive, well-structured documentation.`;

  try {
    const response = await fetch('http://localhost:7000/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'default',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Odysseus API error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.response || 'No response from Odysseus';
  } catch (error) {
    console.error('Error generating custom documentation with Odysseus:', error);
    return 'Error: Failed to generate documentation with Odysseus AI';
  }
}
