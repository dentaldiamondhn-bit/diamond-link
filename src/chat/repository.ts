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

/**
 * Thin data-access layer for the chat UI.
 *
 * Every method takes the current user id (Clerk id) explicitly so the store /
 * components never depend on Supabase session state. Clerk is the source of
 * truth for auth in this app.
 */
export class ChatRepository {
  /** Get conversations for a user */
  static async getConversations(userId: string, filters?: ChatFilters): Promise<ChatConversation[]> {
    const result = await ChatService.getConversations(userId, filters);
    return result.data;
  }

  /** Get a conversation with its messages */
  static async getConversation(userId: string, conversationId: string) {
    const result = await ChatService.getConversation(conversationId, userId);
    return {
      conversation: result.data?.conversation,
      messages: result.data?.messages,
    };
  }

  /** Create a new conversation */
  static async createConversation(userId: string, data: CreateConversationData) {
    const result = await ChatService.createConversation(userId, data);
    return result.data;
  }

  /** Update a conversation */
  static async updateConversation(userId: string, conversationId: string, data: UpdateConversationData) {
    const result = await ChatService.updateConversation(conversationId, userId, data);
    return result.data;
  }

  /** Delete a conversation */
  static async deleteConversation(userId: string, conversationId: string) {
    await ChatService.deleteConversation(conversationId, userId);
  }

  /** Get messages for a conversation (paginated) */
  static async getMessages(
    userId: string,
    conversationId: string,
    before?: string,
    limit = 50
  ): Promise<ChatMessage[]> {
    const result = await ChatService.getMessages(conversationId, userId, before, limit);
    return result.data;
  }

  /** Send a message (text, file, image, voice, patient_case) */
  static async sendMessage(userId: string, data: CreateMessageData) {
    const result = await ChatService.sendMessage(userId, data);
    return result.data;
  }

  /** Edit a message */
  static async updateMessage(
    userId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ) {
    const result = await ChatService.updateMessage(userId, messageId, updates);
    return result.data;
  }

  /** Soft-delete a message */
  static async deleteMessage(userId: string, messageId: string): Promise<void> {
    await ChatService.deleteMessage(userId, messageId);
  }

  /** Add a reaction to a message */
  static async addReaction(userId: string, messageId: string, emoji: string): Promise<void> {
    await ChatService.addReaction(messageId, userId, emoji);
  }

  /** Remove a reaction from a message */
  static async removeReaction(userId: string, messageId: string, emoji: string): Promise<void> {
    await ChatService.removeReaction(messageId, userId, emoji);
  }

  /** Mark a conversation as read (bump last_read_at + record per-message reads) */
  static async markAsRead(userId: string, conversationId: string) {
    await ChatService.markConversationRead(conversationId, userId);
  }

  /** Get unread count for a conversation */
  static async getUnreadCount(userId: string, conversationId: string): Promise<number> {
    const result = await ChatService.getUnreadCount(conversationId, userId);
    return result.data;
  }

  /** Upload a file to Supabase storage via the server route and return its public URL */
  static async uploadFile(file: File, conversationId: string): Promise<{ url: string; fileName: string; fileType: string; fileSize: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);

    const response = await fetch('/api/chat/upload', { method: 'POST', body: formData });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al subir archivo');
    }

    return {
      url: result.uploadedUrl,
      fileName: result.fileName || file.name,
      fileType: result.fileType || file.type,
      fileSize: result.fileSize || file.size,
    };
  }

  /** Upload a voice note blob to Supabase storage */
  static async uploadVoiceNote(blob: Blob, fileName: string): Promise<string> {
    const { error } = await supabase
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

  /** Fetch the app-wide user list (Clerk-backed) exposed for the store */
  static async fetchAllUsers(): Promise<ChatUser[]> {
    const response = await fetch('/api/users');
    if (!response.ok) return [];
    const data = await response.json();
    const users = Array.isArray(data) ? data : data?.data || [];
    return users.map((u: any) => {
      let firstName = u.first_name || u.firstName || '';
      let lastName = u.last_name || u.lastName || '';
      if (!firstName && !lastName && u.name) {
        const parts = u.name.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
      return {
        id: u.id,
        email: u.email || '',
        first_name: firstName,
        last_name: lastName,
        profile_image_url: u.profileImageUrl || u.profile_image_url || null,
        role: u.role || 'staff',
      };
    });
  }
}