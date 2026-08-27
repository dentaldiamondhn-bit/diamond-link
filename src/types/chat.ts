// Chat System Types for Dental Diamond Link

export enum ChatConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  CHANNEL = 'channel'
}

export enum ChatMessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VOICE = 'voice',
  PATIENT_CASE = 'patient_case',
  SYSTEM = 'system'
}

export enum ChatParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

export enum PatientCaseLinkType {
  CONSENT = 'consent',
  ODONTOGRAM = 'odontogram',
  TREATMENT = 'treatment',
  EVENT = 'event',
  PRESUPUESTO = 'presupuesto',
  PAYMENT = 'payment',
  GENERAL = 'general'
}

export interface ChatConversation {
  id: string;
  name: string | null;
  type: ChatConversationType;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  is_pinned: boolean;
  is_archived: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  creator?: ChatUser;
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ChatParticipantRole;
  is_muted: boolean;
  is_pinned: boolean;
  last_read_at: string | null;
  joined_at: string;
  
  // Relations
  user?: ChatUser;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: ChatMessageType;
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  reactions: MessageReaction[];
  created_at: string;
  updated_at: string;
  // Voice note fields
  voice_note_url?: string;
  voice_note_duration?: number; // in seconds
  
  // Relations
  sender?: ChatUser;
  reply_to?: ChatMessage;
  attachments?: ChatAttachment[];
  patient_case_link?: ChatPatientCaseLink;
}

export interface MessageReaction {
  emoji: string;
  user_id: string;
  created_at: string;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface ChatPatientCaseLink {
  id: string;
  message_id: string;
  patient_id: string;
  link_type: PatientCaseLinkType;
  linked_id: string;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_by: string;
  created_at: string;
  
  // Relations
  patient?: {
    id: string;
    nombre_completo: string;
  };
}

export interface ChatUser {
  id: string;
  clerk_id?: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  role?: string;
}

export interface CreateConversationData {
  name?: string;
  type: ChatConversationType;
  description?: string;
  participant_ids: string[];
}

export interface CreateMessageData {
  conversation_id: string;
  content: string;
  message_type?: ChatMessageType;
  reply_to_id?: string;
  attachments?: FileAttachmentData[];
  patient_case_link?: PatientCaseLinkData;
}

export interface FileAttachmentData {
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
}

export interface PatientCaseLinkData {
  patient_id: string;
  link_type: PatientCaseLinkType;
  linked_id: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateConversationData {
  name?: string;
  description?: string;
  avatar_url?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface ChatFilters {
  type?: ChatConversationType;
  search?: string;
  is_pinned?: boolean;
}

export interface ConversationWithMessages {
  conversation: ChatConversation;
  messages: ChatMessage[];
  participants: ChatParticipant[];
}
