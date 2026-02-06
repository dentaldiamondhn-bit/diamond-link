import { supabase } from '../lib/supabase';
import { ChatEncryptionService } from './chatEncryptionService';

export interface ChatRoom {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'patient_case';
  created_by_clerk_id: string;
  paciente_id?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_clerk_id: string;
  encrypted_content: string;
  content_key: string;
  iv: string;
  message_type: 'text' | 'file' | 'patient_share' | 'system';
  paciente_id?: string;
  created_at: string;
}

export class ChatService {
  // Create room
  static async createRoom(
    name: string | undefined,
    type: 'direct' | 'group' | 'patient_case',
    createdByClerkId: string,
    pacienteId?: string
  ): Promise<ChatRoom> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name,
        type,
        created_by_clerk_id: createdByClerkId,
        paciente_id: pacienteId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create room: ${error.message}`);
    return data;
  }

  // Get user's rooms
  static async getUserRooms(clerkUserId: string): Promise<ChatRoom[]> {
    try {
      console.log('Loading rooms for user:', clerkUserId);
      
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
        console.error('Error loading user rooms:', error);
        throw error;
      }

      const rooms = data.map(member => member.chat_rooms).flat();
      console.log('Found rooms:', rooms);
      
      return rooms;
    } catch (error) {
      console.error('Error in getUserRooms:', error);
      return [];
    }
  }

  // Get room members
  static async getRoomMembers(roomId: string): Promise<{clerk_user_id: string, role: string}[]> {
    try {
      const { data, error } = await supabase
        .from('chat_room_members')
        .select('clerk_user_id, role')
        .eq('room_id', roomId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting room members:', error);
      return [];
    }
  }

  // Add member to room
  static async addMemberToRoom(
    roomId: string,
    clerkUserId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_room_members')
      .insert({
        room_id: roomId,
        clerk_user_id: clerkUserId,
        role,
      });

    if (error) throw new Error(`Failed to add member: ${error.message}`);
  }

  // Send a message (temporary fix without encryption to bypass index issue)
  static async sendMessage(
    roomId: string, 
    senderClerkId: string, 
    content: string, 
    type: 'text' | 'file' = 'text'
  ): Promise<ChatMessage> {
    try {
      // For now, skip encryption and store content directly to bypass the index issue
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_clerk_id: senderClerkId,
          encrypted_content: content, // Store content directly for now
          content_key: '', // Empty for now
          iv: '', // Empty for now
          message_type: type,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to send message: ${error.message}`);
      return data;
    } catch (error) {
      console.error('ChatService.sendMessage error:', error);
      throw error;
    }
  }

  // Get room messages
  static async getRoomMessages(roomId: string): Promise<ChatMessage[]> {
    console.log('Loading messages for room:', roomId);
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      throw new Error(`Failed to get messages: ${error.message}`);
    }
    
    console.log('Found messages:', data?.length || 0);
    
    // For now, return the content directly since we're not encrypting
    return data || [];
  }

  // Create direct message room
  static async createDirectMessageRoom(
    user1ClerkId: string,
    user2ClerkId: string
  ): Promise<ChatRoom> {
    const room = await this.createRoom(
      undefined,
      'direct',
      user1ClerkId
    );

    await this.addMemberToRoom(room.id, user1ClerkId, 'admin');
    await this.addMemberToRoom(room.id, user2ClerkId, 'member');

    return room;
  }

  // Create patient case room
  static async createPatientCaseRoom(
    pacienteId: string,
    createdByClerkId: string,
    participantClerkIds: string[]
  ): Promise<ChatRoom> {
    const room = await this.createRoom(
      `Patient Case - ${pacienteId}`,
      'patient_case',
      createdByClerkId,
      pacienteId
    );

    // Add creator as admin
    await this.addMemberToRoom(room.id, createdByClerkId, 'admin');

    // Add other participants
    for (const clerkId of participantClerkIds) {
      await this.addMemberToRoom(room.id, clerkId, 'member');
    }

    return room;
  }
}
