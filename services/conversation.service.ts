import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Zod schemas for validation
const ConversationSchema = z.object({
  user_id: z.string().min(1),
  title: z.string().min(1).max(255).default('New Conversation'),
  model: z.string().min(1).max(50).default('local-llama'),
});

const MessageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  model: z.string().optional(),
});

const CreateConversationWithMessagesSchema = z.object({
  title: z.string().min(1).max(255).default('New Conversation'),
  model: z.string().min(1).max(50).default('local-llama'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1),
  })).optional(),
});

// TypeScript interfaces
export interface IConversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
  messages?: IMessage[];
}

export interface IMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  created_at: string;
}

export interface ICreateConversation {
  title?: string;
  model?: string;
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface IUpdateConversation {
  title?: string;
  model?: string;
}

export class ConversationService {
  /**
   * Create a new conversation with optional initial messages
   */
  async createConversation(userId: string, data: ICreateConversation = {}): Promise<IConversation> {
    const validatedData = CreateConversationWithMessagesSchema.parse(data);
    
    // Create conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: validatedData.title || 'New Conversation',
        model: validatedData.model || 'local-llama',
      })
      .select()
      .single();

    if (conversationError) {
      throw new Error(`Failed to create conversation: ${conversationError.message}`);
    }

    // Add initial messages if provided
    if (validatedData.messages && validatedData.messages.length > 0) {
      const messageData = validatedData.messages.map((message) => ({
        conversation_id: conversation.id,
        role: message.role,
        content: message.content,
        model: message.role === 'assistant' ? validatedData.model : undefined,
      }));

      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData);

      if (messageError) {
        throw new Error(`Failed to create messages: ${messageError.message}`);
      }
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<IConversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          model,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true, foreignTable: 'messages' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get conversations:', error);
      return []; // Return empty array instead of throwing error
    }

    return data || [];
  }

  /**
   * Get a single conversation with its messages
   */
  async getConversationById(conversationId: string, userId: string): Promise<IConversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          model,
          created_at
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Conversation not found
      }
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return data;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, message: Omit<IMessage, 'id' | 'conversation_id' | 'created_at'>): Promise<IMessage> {
    const validatedMessage = MessageSchema.parse({
      conversation_id: conversationId,
      ...message,
    });

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: validatedMessage.conversation_id,
        role: validatedMessage.role,
        content: validatedMessage.content,
        model: validatedMessage.model,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  }

  /**
   * Update conversation details
   */
  async updateConversation(conversationId: string, userId: string, data: IUpdateConversation): Promise<IConversation> {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    return conversation;
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, userId: string): Promise<IMessage[]> {
    // First verify user owns the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data || [];
  }
}

export const conversationService = new ConversationService();
