import { supabase } from '@/lib/supabase';
import {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  CreateConversationData,
  CreateMessageData,
  UpdateConversationData,
  ChatFilters
} from '@/types/chat';

export class ChatService {
  static async getConversations(userId: string, filters?: ChatFilters) {
    // First, get conversation IDs where user is a participant
    const { data: myParts, error: partErr } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partErr) throw partErr;
    if (!myParts || myParts.length === 0) return { data: [] };

    const convIds = myParts.map(p => p.conversation_id);

    let query = supabase
      .from('chat_conversations')
      .select(`
        *,
        participants:chat_participants(*),
        last_message:chat_messages(
          id,
          content,
          sender_id,
          message_type,
          created_at
        )
      `)
      .in('id', convIds)
      .neq('is_archived', true)
      .order('last_message_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters?.is_pinned !== undefined) {
      query = query.eq('is_pinned', filters.is_pinned);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as ChatConversation[] };
  }

  static async getConversation(conversationId: string, userId: string) {
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('Not a participant');
    }

    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select(`*, participants:chat_participants(*)`)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        reply_to:chat_messages(id, content),
        attachments:chat_attachments(*),
        patient_case_link:chat_patient_case_links(
          *,
          patient:patients(paciente_id, nombre_completo)
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(100);

    if (msgError) throw msgError;

    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    return {
      data: {
        conversation: conversation as ChatConversation,
        messages: (messages || []) as ChatMessage[]
      }
    };
  }

  static async createConversation(userId: string, data: CreateConversationData) {
    let conversationName = data.name;
    let conversationType = data.type;

    if (data.type === 'direct' && data.participant_ids?.length === 1) {
      conversationName = 'Chat';
    }

    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .insert({
        name: conversationName,
        type: conversationType,
        description: data.description,
        created_by: userId
      })
      .select()
      .single();

    if (convError) throw convError;

    const allParticipantIds = [userId, ...data.participant_ids];
    const participants = allParticipantIds.map((uid, index) => ({
      conversation_id: conversation.id,
      user_id: uid,
      role: index === 0 ? 'owner' : 'member'
    }));

    const { error: partError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (partError) {
      await supabase.from('chat_conversations').delete().eq('id', conversation.id);
      throw partError;
    }

    return { data: conversation as ChatConversation };
  }

  static async updateConversation(conversationId: string, userId: string, data: UpdateConversationData) {
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant || !['owner', 'admin'].includes(participant.role)) {
      throw new Error('Not authorized');
    }

    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) throw error;
    return { data: conversation as ChatConversation };
  }

  static async deleteConversation(conversationId: string, userId: string) {
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('created_by')
      .eq('id', conversationId)
      .single();

    if (!conversation || conversation.created_by !== userId) {
      throw new Error('Not authorized');
    }

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
    return { success: true };
  }

  static async getMessages(conversationId: string, userId: string, before?: string, limit = 50) {
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('Not a participant');
    }

    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        reply_to:chat_messages(id, content),
        attachments:chat_attachments(*),
        patient_case_link:chat_patient_case_links(
          *,
          patient:patients(paciente_id, nombre_completo)
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    return { data: (data || []) as ChatMessage[] };
  }

  static async sendMessage(userId: string, data: CreateMessageData) {
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('conversation_id', data.conversation_id)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('Not a participant');
    }

    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: data.conversation_id,
        sender_id: userId,
        content: data.content,
        message_type: data.message_type || 'text',
        reply_to_id: data.reply_to_id
      })
      .select()
      .single();

    if (msgError) throw msgError;

    if (data.attachments && data.attachments.length > 0) {
      const attachmentRecords = data.attachments.map(att => ({
        message_id: message.id,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size,
        file_url: att.file_url,
        thumbnail_url: att.thumbnail_url,
        uploaded_by: userId
      }));

      await supabase.from('chat_attachments').insert(attachmentRecords);
    }

    if (data.patient_case_link) {
      await supabase.from('chat_patient_case_links').insert({
        message_id: message.id,
        patient_id: data.patient_case_link.patient_id,
        link_type: data.patient_case_link.link_type,
        linked_id: data.patient_case_link.linked_id,
        title: data.patient_case_link.title,
        description: data.patient_case_link.description,
        metadata: data.patient_case_link.metadata,
        created_by: userId
      });
    }

    await supabase
      .from('chat_conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.conversation_id);

    const { data: fullMessage } = await supabase
      .from('chat_messages')
      .select(`
        *,
        reply_to:chat_messages(id, content),
        attachments:chat_attachments(*),
        patient_case_link:chat_patient_case_links(
          *,
          patient:patients(paciente_id, nombre_completo)
        )
      `)
      .eq('id', message.id)
      .single();

    return { data: fullMessage as ChatMessage };
  }

  static async addReaction(messageId: string, userId: string, emoji: string) {
    const { data: message } = await supabase
      .from('chat_messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (!message) {
      throw new Error('Message not found');
    }

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex((r: any) => r.user_id === userId && r.emoji === emoji);
    
    if (existingIndex >= 0) {
      reactions.splice(existingIndex, 1);
    } else {
      reactions.push({ emoji, user_id: userId, created_at: new Date().toISOString() });
    }

    const { error } = await supabase
      .from('chat_messages')
      .update({ reactions, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) throw error;
    return { success: true };
  }

  static async getUnreadCount(conversationId: string, userId: string) {
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .gt('created_at', participant?.last_read_at || '1970-01-01');

    return { data: count || 0 };
  }

  static async addParticipant(conversationId: string, userId: string, addedBy: string) {
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('created_by, type')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const { data: adderParticipant } = await supabase
      .from('chat_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', addedBy)
      .single();

    if (!adderParticipant || !['owner', 'admin', 'moderator'].includes(adderParticipant.role)) {
      throw new Error('Not authorized to add participants');
    }

    if (conversation.type === 'direct') {
      throw new Error('Cannot add participants to direct message');
    }

    const { error } = await supabase
      .from('chat_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'member'
      });

    if (error) throw error;
    return { success: true };
  }

  static async removeParticipant(conversationId: string, userId: string, removedBy: string) {
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', removedBy)
      .single();

    if (!participant || !['owner', 'admin'].includes(participant.role)) {
      throw new Error('Not authorized to remove participants');
    }

    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }
}
