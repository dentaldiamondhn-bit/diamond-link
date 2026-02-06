import { supabase } from '../lib/supabase';

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'patient_case';
  name?: string;
  participant_ids: string[];
  created_by_clerk_id: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  paciente_id?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_clerk_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: string;
  updated_at: string;
  sender_name?: string;
  is_deleted?: boolean;
}

export class ConversationService {
  
  /**
   * Get all conversations for a user
   */
  static async getUserConversations(clerkUserId: string): Promise<Conversation[]> {
    try {
      // Try conversations table first
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(
            clerk_user_id,
            joined_at
          )
        `)
        .eq('conversation_participants.clerk_user_id', clerkUserId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        
        // If conversations table doesn't exist, fall back to chat_rooms
        if (error.code === 'PGRST116') {
          console.log('Conversations table not found, falling back to chat_rooms');
          return this.getRoomsAsConversations(clerkUserId);
        }
        
        // For any other error, also try fallback
        console.log('Trying fallback to chat_rooms due to error');
        return this.getRoomsAsConversations(clerkUserId);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      console.log('Trying fallback to chat_rooms due to exception');
      return this.getRoomsAsConversations(clerkUserId);
    }
  }

  /**
   * Fallback method to convert chat_rooms to conversations format
   */
  private static async getRoomsAsConversations(clerkUserId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('chat_room_members')
        .select(`
          room_id,
          role,
          chat_rooms!inner(
            id,
            name,
            type,
            created_by_clerk_id,
            created_at,
            paciente_id
          )
        `)
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        console.error('Error fetching rooms as conversations:', error);
        return [];
      }

      const rooms = data.map(member => member.chat_rooms);
      
      // For each room, fetch all participants to build proper participant_ids array
      const conversations = await Promise.all(rooms.map(async (room: any) => {
        try {
          // Fetch all members of this room
          const { data: members, error: membersError } = await supabase
            .from('chat_room_members')
            .select('clerk_user_id')
            .eq('room_id', room.id);

          if (membersError) {
            console.error('Error fetching room members:', membersError);
            // Fallback to just the creator
            return {
              id: room.id,
              type: room.type as 'direct' | 'group' | 'patient_case',
              name: room.name,
              participant_ids: [room.created_by_clerk_id],
              created_by_clerk_id: room.created_by_clerk_id,
              created_at: room.created_at,
              updated_at: room.created_at,
              last_message: undefined,
              last_message_time: undefined,
              unread_count: 0,
              paciente_id: room.paciente_id
            };
          }

          const participantIds = members?.map((member: any) => member.clerk_user_id) || [room.created_by_clerk_id];
          
          return {
            id: room.id,
            type: room.type as 'direct' | 'group' | 'patient_case',
            name: room.name,
            participant_ids: participantIds,
            created_by_clerk_id: room.created_by_clerk_id,
            created_at: room.created_at,
            updated_at: room.created_at,
            last_message: undefined,
            last_message_time: undefined,
            unread_count: 0,
            paciente_id: room.paciente_id
          };
        } catch (error) {
          console.error('Error processing room:', room.id, error);
          // Return basic conversation info
          return {
            id: room.id,
            type: room.type as 'direct' | 'group' | 'patient_case',
            name: room.name,
            participant_ids: [room.created_by_clerk_id],
            created_by_clerk_id: room.created_by_clerk_id,
            created_at: room.created_at,
            updated_at: room.created_at,
            last_message: undefined,
            last_message_time: undefined,
            unread_count: 0,
            paciente_id: room.paciente_id
          };
        }
      }));
      
      return conversations;
    } catch (error) {
      console.error('Error in getRoomsAsConversations:', error);
      return [];
    }
  }

  /**
   * Create or get a direct message conversation
   */
  static async getOrCreateDirectConversation(
    user1ClerkId: string,
    user2ClerkId: string
  ): Promise<Conversation> {
    try {
      // First check if conversation already exists
      const { data: existingConversations, error: checkError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(
            clerk_user_id,
            joined_at
          )
        `)
        .eq('type', 'direct')
        .eq('conversation_participants.clerk_user_id', user1ClerkId);

      if (checkError) {
        console.error('Error checking existing conversations:', checkError);
        
        // If conversations table doesn't exist, fall back to chat_rooms
        if (checkError.code === 'PGRST116') {
          console.log('Conversations table not found, falling back to chat_rooms');
          return this.createDirectRoomAsConversation(user1ClerkId, user2ClerkId);
        }
        
        // For any other error, also try fallback
        console.log('Trying fallback to chat_rooms due to error');
        return this.createDirectRoomAsConversation(user1ClerkId, user2ClerkId);
      }

      // Check if there's already a conversation between these two users
      const existingConversation = existingConversations?.find(conv => 
        conv.participant_ids.includes(user2ClerkId)
      );

      if (existingConversation) {
        return existingConversation;
      }

      // Create new direct conversation
      const { data, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          participant_ids: [user1ClerkId, user2ClerkId],
          created_by_clerk_id: user1ClerkId,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        
        // If conversations table doesn't exist, fall back to chat_rooms
        if (createError.code === 'PGRST116') {
          console.log('Conversations table not found, falling back to chat_rooms');
          return this.createDirectRoomAsConversation(user1ClerkId, user2ClerkId);
        }
        
        // For any other error, also try fallback
        console.log('Trying fallback to chat_rooms due to error');
        return this.createDirectRoomAsConversation(user1ClerkId, user2ClerkId);
      }

      // Add participants
      try {
        await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: data.id, clerk_user_id: user1ClerkId },
            { conversation_id: data.id, clerk_user_id: user2ClerkId }
          ]);
      } catch (participantError) {
        console.log('Could not add conversation participants (table might not exist):', participantError);
      }

      return data;
    } catch (error) {
      console.error('Error creating direct conversation:', error);
      console.log('Trying fallback to chat_rooms due to exception');
      return this.createDirectRoomAsConversation(user1ClerkId, user2ClerkId);
    }
  }

  /**
   * Fallback method to create direct room using chat_rooms system
   */
  private static async createDirectRoomAsConversation(
    user1ClerkId: string,
    user2ClerkId: string
  ): Promise<Conversation> {
    try {
      // Check if room already exists
      const { data: existingRooms, error: checkError } = await supabase
        .from('chat_room_members')
        .select(`
          room_id,
          chat_rooms!inner(
            id,
            type,
            created_by_clerk_id,
            created_at
          )
        `)
        .eq('chat_rooms.type', 'direct')
        .eq('clerk_user_id', user1ClerkId);

      if (checkError) {
        throw checkError;
      }

      // Check if there's already a room between these two users
      const existingRoom = existingRooms?.find((room: any) => 
        room.chat_rooms.created_by_clerk_id === user2ClerkId
      );

      if (existingRoom) {
        // Convert to conversation format
        return {
          id: existingRoom.chat_rooms.id,
          type: existingRoom.chat_rooms.type as 'direct',
          name: existingRoom.chat_rooms.name,
          participant_ids: [existingRoom.chat_rooms.created_by_clerk_id],
          created_by_clerk_id: existingRoom.chat_rooms.created_by_clerk_id,
          created_at: existingRoom.chat_rooms.created_at,
          updated_at: existingRoom.chat_rooms.created_at,
          last_message: undefined,
          last_message_time: undefined,
          unread_count: 0,
          paciente_id: undefined
        };
      }

      // Create new direct room
      const { data, error: createError } = await supabase
        .from('chat_rooms')
        .insert({
          type: 'direct',
          created_by_clerk_id: user1ClerkId,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Add both users as members
      try {
        await supabase
          .from('chat_room_members')
          .insert([
            { room_id: data.id, clerk_user_id: user1ClerkId, role: 'admin' },
            { room_id: data.id, clerk_user_id: user2ClerkId, role: 'member' }
          ]);
      } catch (memberError) {
        console.log('Could not add room members:', memberError);
      }

      // Convert to conversation format
      return {
        id: data.id,
        type: data.type as 'direct',
        name: data.name,
        participant_ids: [user1ClerkId, user2ClerkId],
        created_by_clerk_id: data.created_by_clerk_id,
        created_at: data.created_at,
        updated_at: data.created_at,
        last_message: undefined,
        last_message_time: undefined,
        unread_count: 0,
        paciente_id: undefined
      };
    } catch (error) {
      console.error('Error creating direct room as conversation:', error);
      throw error;
    }
  }

  /**
   * Create a group conversation
   */
  static async createGroupConversation(
    name: string,
    createdByClerkId: string,
    participantIds: string[]
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name: name.trim(),
          participant_ids: [createdByClerkId, ...participantIds],
          created_by_clerk_id: createdByClerkId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add all participants
      const participants = [
        { conversation_id: data.id, clerk_user_id: createdByClerkId },
        ...participantIds.map(id => ({ conversation_id: data.id, clerk_user_id: id }))
      ];

      await supabase
        .from('conversation_participants')
        .insert(participants);

      return data;
    } catch (error) {
      console.error('Error creating group conversation:', error);
      throw error;
    }
  }

  /**
   * Create a patient case conversation
   */
  static async createPatientCaseConversation(
    pacienteId: string,
    createdByClerkId: string,
    participantIds: string[] = []
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          type: 'patient_case',
          paciente_id: pacienteId,
          participant_ids: [createdByClerkId, ...participantIds],
          created_by_clerk_id: createdByClerkId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add all participants
      const participants = [
        { conversation_id: data.id, clerk_user_id: createdByClerkId },
        ...participantIds.map(id => ({ conversation_id: data.id, clerk_user_id: id }))
      ];

      await supabase
        .from('conversation_participants')
        .insert(participants);

      return data;
    } catch (error) {
      console.error('Error creating patient case conversation:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    try {
      // Try conversation_messages table first
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conversation messages:', error);
        
        // If conversation_messages table doesn't exist, fall back to chat_messages
        if (error.code === 'PGRST116') {
          console.log('Conversation_messages table not found, falling back to chat_messages');
          return this.getRoomMessagesAsConversationMessages(conversationId);
        }
        
        // For any other error, also try fallback
        console.log('Trying fallback to chat_messages due to error');
        return this.getRoomMessagesAsConversationMessages(conversationId);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      console.log('Trying fallback to chat_messages due to exception');
      return this.getRoomMessagesAsConversationMessages(conversationId);
    }
  }

  /**
   * Fallback method to convert chat_messages to conversation messages format
   */
  private static async getRoomMessagesAsConversationMessages(roomId: string): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching room messages as conversation messages:', error);
        return [];
      }

      // Convert room messages to conversation message format
      return data.map((message: any) => ({
        id: message.id,
        conversation_id: message.room_id,
        sender_clerk_id: message.sender_clerk_id,
        content: message.encrypted_content || message.content || '',
        message_type: message.message_type || 'text',
        sender_name: undefined, // This field doesn't exist in chat_messages
        created_at: message.created_at,
        updated_at: message.updated_at,
        is_deleted: false // This field doesn't exist in chat_messages
      }));
    } catch (error) {
      console.error('Error in getRoomMessagesAsConversationMessages:', error);
      return [];
    }
  }

  /**
   * Send a message in a conversation
   */
  static async sendMessage(
    conversationId: string,
    senderClerkId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    senderName?: string
  ): Promise<ConversationMessage> {
    try {
      // Try conversation_messages table first
      const { data, error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_clerk_id: senderClerkId,
          content: content.trim(),
          message_type: messageType,
          sender_name: senderName,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending conversation message:', error);
        
        // If conversation_messages table doesn't exist, fall back to chat_messages
        if (error.code === 'PGRST116') {
          console.log('Conversation_messages table not found, falling back to chat_messages');
          return this.sendRoomMessageAsConversationMessage(conversationId, senderClerkId, content, messageType, senderName);
        }
        
        // For any other error, also try fallback
        console.log('Trying fallback to chat_messages due to error');
        return this.sendRoomMessageAsConversationMessage(conversationId, senderClerkId, content, messageType, senderName);
      }

      // Update conversation's last message and timestamp
      try {
        await supabase
          .from('conversations')
          .update({
            last_message: content.trim(),
            last_message_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      } catch (updateError) {
        console.log('Could not update conversation (table might not exist):', updateError);
      }

      return data;
    } catch (error) {
      console.error('Error sending conversation message:', error);
      console.log('Trying fallback to chat_messages due to exception');
      return this.sendRoomMessageAsConversationMessage(conversationId, senderClerkId, content, messageType, senderName);
    }
  }

  /**
   * Fallback method to send message using chat_messages table
   */
  private static async sendRoomMessageAsConversationMessage(
    roomId: string,
    senderClerkId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    senderName?: string
  ): Promise<ConversationMessage> {
    try {
      // Generate a simple IV (initialization vector) for the message
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const ivBase64 = btoa(String.fromCharCode(...iv));

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_clerk_id: senderClerkId,
          encrypted_content: content.trim(), // Using encrypted_content field
          content_key: content.trim(), // Required field for chat_messages
          iv: ivBase64, // Required field for encryption
          message_type: messageType,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Convert to conversation message format
      return {
        id: data.id,
        conversation_id: data.room_id,
        sender_clerk_id: data.sender_clerk_id,
        content: data.encrypted_content || data.content || '',
        message_type: data.message_type || 'text',
        sender_name: undefined, // This field doesn't exist in chat_messages
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_deleted: false // This field doesn't exist in chat_messages
      };
    } catch (error) {
      console.error('Error sending room message as conversation message:', error);
      throw error;
    }
  }

  /**
   * Get conversation participants
   */
  static async getConversationParticipants(conversationId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('clerk_user_id')
        .eq('conversation_id', conversationId);

      if (error) throw error;
      
      return data?.map(p => p.clerk_user_id) || [];
    } catch (error) {
      console.error('Error fetching conversation participants:', error);
      return [];
    }
  }

  /**
   * Add participant to conversation
   */
  static async addParticipantToConversation(
    conversationId: string,
    clerkUserId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          clerk_user_id: clerkUserId
        });

      if (error) throw error;

      // Update conversation participants list
      const { data: conversation } = await supabase
        .from('conversations')
        .select('participant_ids')
        .eq('id', conversationId)
        .single();

      if (conversation) {
        const updatedParticipants = [...conversation.participant_ids, clerkUserId];
        await supabase
          .from('conversations')
          .update({ participant_ids: updatedParticipants })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error adding participant to conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation details by ID
   */
  static async getConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(
            clerk_user_id,
            joined_at
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        if (error.code === 'PGRST116') {
          console.log('Conversations table not found, trying chat_rooms fallback');
          return this.getRoomById(conversationId);
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  /**
   * Fallback method to get room details by ID
   */
  private static async getRoomById(roomId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_room_members!inner(
            clerk_user_id,
            role
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) {
        throw error;
      }

      // Convert to conversation format
      const participantIds = data.chat_room_members?.map((member: any) => member.clerk_user_id) || [];
      
      return {
        id: data.id,
        type: data.type as 'direct' | 'group' | 'patient_case',
        name: data.name,
        participant_ids: participantIds,
        created_by_clerk_id: data.created_by_clerk_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_message: undefined,
        last_message_time: undefined,
        unread_count: 0,
        paciente_id: data.paciente_id
      };
    } catch (error) {
      console.error('Error fetching room:', error);
      return null;
    }
  }
}
