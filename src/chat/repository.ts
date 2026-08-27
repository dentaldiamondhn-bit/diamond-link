import { ChatService } from '@/services/chatService';
import { supabase } from '@/lib/supabase';
import type {
  ChatConversation,
  ChatMessage,
  ChatUser,
  CreateConversationData,
  CreateMessageData,
  UpdateConversationData,
  ChatFilters,
} from '@/types/chat';

export class ChatRepository {
  /** Get the current user ID from Supabase auth */
  private static async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    return user.id;
  }

  /** Get conversations for a user */
  static async getConversations(filters?: ChatFilters) {
    const userId = await this.getCurrentUserId();
    const result = await ChatService.getConversations(userId, filters);
    return result.data;
  }

  /** Get a conversation with its messages */
  static async getConversation(conversationId: string) {
    const userId = await this.getCurrentUserId();
    const result = await ChatService.getConversation(conversationId, userId);
    return {
      conversation: result.conversation,
      messages: result.messages,
    };
  }

  /** Create a new conversation */
  static async createConversation(data: CreateConversationData) {
    const userId = await this.getCurrentUserId();
    const result = await ChatService.createConversation(userId, data);
    return result.data;
  }

  /** Update a conversation */
  static async updateConversation(conversationId: string, data: UpdateConversationData) {
    const userId = await this.getCurrentUserId();
    const result = await ChatService.updateConversation(conversationId, userId, data);
    return result.data;
  }

  /** Delete a conversation */
  static async deleteConversation(conversationId: string) {
    const userId = await this.getCurrentUserId();
    await ChatService.deleteConversation(conversationId, userId);
  }

  /** Get messages for a conversation (paginated) */
  static async getMessages(
    conversationId: string,
    before?: string,
    limit = 50
  ) {
    const userId = await this.getCurrentUserId();
    const result = await ChatService.getMessages(conversationId, userId, before, limit);
    return result.data;
  }

  /** Send a message (text, file, image, voice, patient_case) */
  static async sendMessage(data: CreateMessageData) {
    const userId = await this.getCurrentUserId();
    const result = await ChatService.sendMessage(userId, data);
    return result.data;
  }

  /** Add a reaction to a message */
  static async addReaction(messageId: string, emoji: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    await ChatService.addReaction(messageId, userId, emoji);
  }

  /** Remove a reaction from a message */
  static async removeReaction(messageId: string, emoji: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    await ChatService.removeReaction(messageId, userId, emoji);
  }

  /** Mark messages as read (update last_read_at in participants) */
  static async markAsRead(conversationId: string) {
    const userId = await this.getCurrentUserId();
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }

  /** Get unread count for a conversation */
  static async getUnreadCount(conversationId: string): Promise<number> {
    const userId = await this.getCurrentUserId();
    const result = await ChatService.getUnreadCount(conversationId, userId);
    return result.data;
  }

  /** Upload a voice note blob to Supabase storage */
  static async uploadVoiceNote(
    blob: Blob,
    fileName: string
  ): Promise<string> {
    const { data, error } = await supabase
      .storage
      .from('chat-voice-notes')
      .upload(fileName, blob, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase
      .storage
      .from('chat-voice-notes')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /** Delete a voice note from storage */
  static async deleteVoiceNote(fileName: string) {
    const { error } = await supabase
      .storage
      .from('chat-voice-notes')
      .remove([fileName]);

    if (error) throw error;
  }

  /** Set typing status for a user in a conversation */
  static async setTyping(conversationId: string, isTyping: boolean): Promise<void> {
    const userId = await this.getCurrentUserId();
    
    await supabase
      .from('chat_presence')
      .upsert(
        {
          conversation_id: conversationId,
          user_id: userId,
          status: isTyping ? 'typing' : 'online',
          updated_at: new Date().toISOString(),
        },
        { onConflict: ['conversation_id', 'user_id'] }
      );
  }

  /** Update a message (e.g., edit content, add reactions, etc.) */
  static async updateMessage(
    messageId: string,
    updates: Partial<ChatMessage>
  ): Promise<ChatMessage> {
    const userId = await this.getCurrentUserId();
    // We'll need to add a method in ChatService for updating message, but we can do it directly
    const { data, error } = await supabase
      .from('chat_messages')
      .update(updates)
      .eq('id', messageId)
      .eq('sender_id', userId) // Ensure user can only update their own messages
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}