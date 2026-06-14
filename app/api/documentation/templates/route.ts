import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

// GET /api/documentation/templates - Get available documentation templates
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = [
      {
        id: 'api-docs',
        name: 'API Documentation',
        description: 'Comprehensive API endpoint documentation',
        category: 'technical',
        sections: ['Overview', 'Authentication', 'Endpoints', 'Examples', 'Error Handling']
      },
      {
        id: 'user-guide',
        name: 'User Guide',
        description: 'End-user documentation for the application',
        category: 'user',
        sections: ['Getting Started', 'Key Features', 'Common Tasks', 'FAQ', 'Troubleshooting']
      },
      {
        id: 'technical-docs',
        name: 'Technical Documentation',
        description: 'Developer and system architecture documentation',
        category: 'technical',
        sections: ['Architecture', 'Components', 'Database Schema', 'API Reference', 'Deployment']
      },
      {
        id: 'release-notes',
        name: 'Release Notes',
        description: 'Release notes and changelog template',
        category: 'release',
        sections: ['Version', 'New Features', 'Bug Fixes', 'Breaking Changes', 'Migration Guide']
      },
      {
        id: 'integration-guide',
        name: 'Integration Guide',
        description: 'Third-party integration documentation',
        category: 'technical',
        sections: ['Overview', 'Setup', 'Authentication', 'API Usage', 'Examples']
      },
      {
        id: 'troubleshooting',
        name: 'Troubleshooting Guide',
        description: 'Common issues and solutions',
        category: 'support',
        sections: ['Common Issues', 'Error Codes', 'Debugging', 'Contact Support']
      },
      {
        id: 'security-docs',
        name: 'Security Documentation',
        description: 'Security policies and best practices',
        category: 'security',
        sections: ['Authentication', 'Authorization', 'Data Protection', 'Compliance', 'Best Practices']
      },
      {
        id: 'custom',
        name: 'Custom AI-Generated',
        description: 'Use Odysseus AI to generate custom documentation',
        category: 'ai',
        sections: ['AI-generated content based on your context']
      }
    ];

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching documentation templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/documentation/templates - Create custom template
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { name, description, category, sections, prompt } = body;
    
    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name and prompt are required' },
        { status: 400 }
      );
    }

    const template = {
      id: `custom-${Date.now()}`,
      name,
      description: description || '',
      category: category || 'custom',
      sections: sections || [],
      prompt,
      isCustom: true,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating documentation template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
