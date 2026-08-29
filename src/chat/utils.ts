import type {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  ChatUser,
} from '@/types/chat';

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-cyan-500',
];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.[0]?.toUpperCase() || '?';
}

export function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getUserDisplayName(user: ChatUser | undefined): string {
  if (!user) return 'Usuario';
  const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  return name || 'Usuario';
}

export function getParticipantUsers(
  conversation: ChatConversation | null,
  currentUserId: string | null
): ChatParticipant[] {
  if (!conversation?.participants) return [];
  return conversation.participants.filter((p) => p.user_id !== currentUserId);
}

function getOtherParticipantId(
  conversation: ChatConversation | null,
  currentUserId: string | null
): string | null {
  if (!conversation || !currentUserId) return null;
  return (
    conversation.participants?.find((p) => p.user_id !== currentUserId)?.user_id ?? null
  );
}

export function getConversationDisplayName(
  conversation: ChatConversation | null,
  currentUserId: string | null,
  users: Record<string, ChatUser>
): string {
  if (!conversation) return 'Chat';
  if (conversation.name && conversation.name !== 'Chat') return conversation.name;
  const others = getParticipantUsers(conversation, currentUserId);
  if (conversation.type === 'direct' && others.length > 0) {
    return getUserDisplayName(users[others[0].user_id]);
  }
  return 'Grupo';
}

export function getConversationAvatar(
  conversation: ChatConversation | null,
  currentUserId: string | null,
  users: Record<string, ChatUser>
): string | null {
  if (!conversation || !currentUserId) return null;
  if (conversation.avatar_url) return conversation.avatar_url;
  const otherId = getOtherParticipantId(conversation, currentUserId);
  if (!otherId) return null;
  return users[otherId]?.profile_image_url ?? null;
}

/** Compact locale-aware timestamp: HH:mm today, "Ayer" yesterday, dd/mm otherwise */
export function formatConversationTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return d.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Ayer';
  return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit' });
}

/**
 * WhatsApp-style delivery status for MY messages: 'sent' (single grey tick),
 * 'delivered' (double grey tick), 'read' (double blue tick). Returns null for
 * messages from the current user that are not theirs (or no data).
 */
export function getMessageReadStatus(
  message: ChatMessage | null | undefined,
  currentUserId: string | null,
  otherParticipantCount: number
): 'sent' | 'delivered' | 'read' | null {
  if (!message || !currentUserId || message.sender_id !== currentUserId) return null;
  const others = (message.reads || []).filter((r) => r.user_id !== currentUserId);
  const readCount = others.filter((r) => !!r.read_at).length;
  const deliveredCount = others.filter((r) => !!r.delivered_at).length;
  const need = Math.max(otherParticipantCount, readCount, deliveredCount);
  if (need > 0 && readCount >= need) return 'read';
  if (need > 0 && deliveredCount >= need) return 'delivered';
  return 'sent';
}