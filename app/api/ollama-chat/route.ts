import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/services/conversation.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

type OllamaRole = 'system' | 'user' | 'assistant';

type OllamaMessage = {
  role: OllamaRole;
  content: string;
};

type OllamaTagResponse = {
  models?: Array<{ name?: string }>;
};

type OllamaChatResponse = {
  model?: string;
  message?: {
    role?: string;
    content?: string;
  };
  done?: boolean;
};

const BASE_SYSTEM_PROMPT = `You are a local AI assistant for Dental Diamond Link, a dental clinic management application. Prefer concise, practical answers.`;

function getRoleBasedPrompt(role: string) {
  if (role === 'tech_support') {
    return `${BASE_SYSTEM_PROMPT}
You have full unrestricted access. You can help with writing and debugging code, explaining code patterns, managing database and system architecture, clinic operations, and any other requests.`;
  }

  if (['admin', 'doctor', 'staff'].includes(role)) {
    return `${BASE_SYSTEM_PROMPT}
You are operating in the clinic management environment. Your primary role is to assist with patient follow-ups, scheduling, treatments, budgets, and general clinic operations. Do not act as a coding assistant or system administrator.`;
  }

  return BASE_SYSTEM_PROMPT;
}

function isOllamaRole(role: string): role is OllamaRole {
  return role === 'system' || role === 'user' || role === 'assistant';
}

function modelExists(models: string[], model: string) {
  return models.includes(model) || models.some((modelName) => modelName.startsWith(`${model}:`));
}

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({
        configured: false,
        models: [],
        defaultModel: OLLAMA_DEFAULT_MODEL,
        status: response.status,
        url: OLLAMA_BASE_URL,
        error: `Ollama returned ${response.status}`
      });
    }

    const data = (await response.json()) as OllamaTagResponse;
    const models = (data.models || [])
      .map((model) => model.name)
      .filter((model): model is string => Boolean(model));

    return NextResponse.json({
      configured: modelExists(models, OLLAMA_DEFAULT_MODEL),
      models,
      defaultModel: OLLAMA_DEFAULT_MODEL,
      url: OLLAMA_BASE_URL
    });
  } catch (error) {
    clearTimeout(timeoutId);
    return NextResponse.json({
      configured: false,
      models: [],
      defaultModel: OLLAMA_DEFAULT_MODEL,
      url: OLLAMA_BASE_URL,
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Ensure Ollama is running and the default model is installed.'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message : '';
    const context = body.context && typeof body.context === 'object' ? body.context : {};
    const userRole = typeof body.userRole === 'string' ? body.userRole : 'guest';
    const userId = typeof body.userId === 'string' ? body.userId : undefined;
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
    const requestedModel = typeof body.model === 'string' ? body.model : OLLAMA_DEFAULT_MODEL;

    if (!message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let currentConversationId = conversationId;

    if (userId) {
      try {
        if (!currentConversationId) {
          const conversations = await conversationService.getConversations(userId);
          if (conversations && conversations.length > 0) {
            currentConversationId = conversations[0].id;
          } else {
            const newConversation = await conversationService.createConversation(userId, {
              title: 'Diamond Assistant',
              model: `ollama:${requestedModel}`
            });
            currentConversationId = newConversation.id;
          }
        }

        if (currentConversationId) {
          await conversationService.addMessage(currentConversationId, {
            role: 'user',
            content: message
          });
        }
      } catch (error) {
        console.error('Error with conversation service in Ollama POST:', error);
      }
    }

    const contextText = Object.keys(context).length > 0
      ? `\n\nAdditional Context:\n${JSON.stringify(context, null, 2)}`
      : '';

    const pastMessages = currentConversationId && userId
      ? await conversationService.getMessages(currentConversationId, userId).catch((error) => {
        console.error('Failed to load Ollama conversation history:', error);
        return [];
      })
      : [];

    const ollamaMessages: OllamaMessage[] = [
      {
        role: 'system',
        content: getRoleBasedPrompt(userRole)
      },
      ...pastMessages
        .map((messageItem) => ({
          role: messageItem.role as OllamaRole,
          content: messageItem.content
        }))
        .filter((messageItem) => isOllamaRole(messageItem.role)),
      {
        role: 'user',
        content: `${message}${contextText}`
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: requestedModel,
          messages: ollamaMessages,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama returned ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      const responseMessage = data.message?.content || 'No response from Ollama';

      if (currentConversationId && userId) {
        try {
          await conversationService.addMessage(currentConversationId, {
            role: 'assistant',
            content: responseMessage,
            model: `ollama:${requestedModel}`
          });
        } catch (error) {
          console.error('Failed to save Ollama assistant message:', error);
        }
      }

      return NextResponse.json({
        message: responseMessage,
        conversationId: currentConversationId,
        model: requestedModel,
        service: 'Ollama Local'
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Error calling Ollama:', error);
    return NextResponse.json(
      {
        error: 'Failed to get response from Ollama',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Verify Ollama is running at OLLAMA_BASE_URL and the requested model is installed.'
      },
      { status: 500 }
    );
  }
}
