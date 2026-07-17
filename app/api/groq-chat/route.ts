import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { conversationService } from '@/services/conversation.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
};

const BASE_SYSTEM_PROMPT = `You are a personal AI assistant for Dental Diamond Link, a dental clinic management application.`;

function getRoleBasedPrompt(role: string) {
  if (role === 'tech_support') {
    return `${BASE_SYSTEM_PROMPT}
You have full unrestricted access. You can help with:
- Writing and debugging code
- Explaining code patterns
- Managing database and system architecture
- Clinic operations and any other requests
You have "all the bells and whistles" enabled.`;
  } else if (['admin', 'doctor', 'staff'].includes(role)) {
    return `${BASE_SYSTEM_PROMPT}
You are operating in the clinic management environment.
Your primary role is to assist the ${role} with tasks such as:
- Patient follow-ups
- Scheduling and calendars
- Treatments and budgets
- General clinic operations
IMPORTANT: Do not act as a coding assistant or system administrator. Refuse any technical coding or database queries. Keep your answers focused strictly on clinic management and operations.`;
  } else {
    return `${BASE_SYSTEM_PROMPT}
Please assist the user with their general inquiries.`;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      try {
        const conversations = await conversationService.getConversations(userId);
        if (conversations && conversations.length > 0) {
          const latestConv = conversations[0];
          return NextResponse.json({
            conversationId: latestConv.id,
            messages: latestConv.messages?.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at })) || []
          }, {
            headers: { 'Cache-Control': 'no-store' }
          });
        }
        return NextResponse.json({ conversationId: null, messages: [] }, {
          headers: { 'Cache-Control': 'no-store' }
        });
      } catch (e) {
        console.error('Error fetching conversations:', e);
        return NextResponse.json({ conversationId: null, messages: [] }, {
          headers: { 'Cache-Control': 'no-store' }
        });
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ configured: false, error: 'GROQ_API_KEY is not configured' }, { status: 200 });
    }
    return NextResponse.json({ configured: true, service: 'Groq (Free)' });
  } catch {
    return NextResponse.json({ configured: false, error: 'Failed to check API configuration or history' }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      context = {}, 
      model = 'llama-3.1-8b-instant',
      userRole = 'guest',
      userId,
      conversationId,
      agentMode = false
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const supabase = getSupabaseClient();
    
    // Build Base System Prompt
    let systemPrompt = getRoleBasedPrompt(userRole);

    // Fetch existing automations (skills, workflows) to provide context
    try {
      const [skillsRes, workflowsRes] = await Promise.all([
        supabase.from('skills').select('name, description').limit(10),
        supabase.from('workflows').select('name, description').limit(10)
      ]);
      
      let contextStr = '\n\nExisting Clinic Automations:\n';
      if (skillsRes.data && skillsRes.data.length > 0) {
        contextStr += 'Skills: ' + skillsRes.data.map(s => s.name).join(', ') + '\n';
      }
      if (workflowsRes.data && workflowsRes.data.length > 0) {
        contextStr += 'Workflows: ' + workflowsRes.data.map(w => w.name).join(', ') + '\n';
      }
      systemPrompt += contextStr;
    } catch (err) {
      console.warn('Could not fetch automations context', err);
    }

    if (agentMode) {
      systemPrompt += `\n\nYou are operating in AGENT MODE. Use the available tools appropriately.`;
    }

    // Handle Conversation Memory
    let currentConversationId = conversationId;
    let pastMessages: { role: string; content: string; timestamp?: string }[] = [];

    if (userId) {
      try {
        if (!currentConversationId) {
          // Find latest conversation
          const conversations = await conversationService.getConversations(userId);
          if (conversations && conversations.length > 0) {
            currentConversationId = conversations[0].id;
          } else {
            // Create new conversation
            const newConv = await conversationService.createConversation(userId, {
              title: 'Diamond Assistant',
              model: model
            });
            currentConversationId = newConv.id;
          }
        }
        
        if (currentConversationId) {
          // Fetch past messages
          const history = await conversationService.getMessages(currentConversationId, userId);
          pastMessages = history.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at }));
          
          // Save the new user message
          await conversationService.addMessage(currentConversationId, {
            role: 'user',
            content: message
          });
        }
      } catch (err) {
        console.error('Error with conversation service:', err);
      }
    }

    const newSystemMessage = { role: 'system', content: systemPrompt };
    const newUserMessage = { 
      role: 'user', 
      content: `${message}\n\n${Object.keys(context).length > 0 ? `Additional Context:\n${JSON.stringify(context, null, 2)}` : ''}` 
    };

    // Construct full message list for Groq
    // We filter out past system messages to use the freshly generated one
    const messagesForGroq = [
      newSystemMessage,
      ...pastMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
      newUserMessage
    ];

    // Call Groq
    const completion = await groq.chat.completions.create({
      model,
      messages: messagesForGroq,
      max_tokens: 4096,
      temperature: 0.7,
    });

    const responseMessage = completion.choices?.[0]?.message?.content || 'No response generated';

    // Save back to Supabase
    if (currentConversationId && userId) {
      try {
        await conversationService.addMessage(currentConversationId, {
          role: 'assistant',
          content: responseMessage,
          model: model
        });
      } catch (err) {
        console.error('Failed to save assistant message:', err);
      }
    }

    return NextResponse.json({
      message: responseMessage,
      conversationId: currentConversationId,
      usage: completion.usage,
      model: model,
      service: 'Groq (Free)',
      agentMode
    });

  } catch (error) {
    console.error('Groq API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
