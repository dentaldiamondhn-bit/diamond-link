import type {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  ChatUser,
} from '@/types/chat';
import type { TranslationKey } from '@/chat/i18n/translations';
import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';

/** Heuristic: does this string contain actual HTML tags (vs plain text)? */
export function isHtmlContent(content: string): boolean {
  return /<\/?[a-zA-Z][^>]*>/.test(content);
}

// DOMPurify supports ALLOWED_STYLE_PROPERTIES at runtime (3.x) but the shipped
// type defs don't declare it. Extend the config type so we keep only the
// color/highlight styles we opt into.
type ChatPurifyConfig = DOMPurifyConfig & { ALLOWED_STYLE_PROPERTIES?: string[] };

/** Sanitize untrusted message HTML before rendering (allows basic text formatting). */
export function purifyHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    // Preserve inline color / highlight styles applied by the composer.
    ADD_ATTR: ['style'],
    ALLOWED_STYLE_PROPERTIES: ['color', 'background-color'],
  } as ChatPurifyConfig);
  // Defense-in-depth: never let the composer's spell-check decoration render in
  // message bubbles. SpellCheckNode.exportDOM already keeps it out of stored
  // content; this also purges any .chat-spell-error persisted before that fix.
  return clean.replace(/\sclass="[^"]*chat-spell-error[^"]*"/g, '');
}

/** Strip tags to plain text for previews / editing UIs. */
export function htmlToText(html: string): string {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = DOMPurify.sanitize(html);
  return el.textContent || '';
}

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

/** Human-readable file size (e.g. "3.2 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Visual metadata for a document (icon bg color) inferred from MIME/extension. */
export function getFileKindMeta(fileType: string, fileName: string): { bg: string } {
  const type = (fileType || '').toLowerCase();
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (type.includes('pdf') || ext === 'pdf') return { bg: 'bg-red-500' };
  if (type.includes('word') || ext === 'doc' || ext === 'docx') return { bg: 'bg-blue-500' };
  if (type.includes('excel') || type.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return { bg: 'bg-emerald-500' };
  }
  if (type.includes('presentation') || type.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) {
    return { bg: 'bg-orange-500' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { bg: 'bg-purple-500' };
  if (type.startsWith('audio/')) return { bg: 'bg-pink-500' };
  if (type.startsWith('video/')) return { bg: 'bg-indigo-500' };
  if (type.startsWith('text/') || ['txt', 'md', 'log'].includes(ext)) return { bg: 'bg-stone-500' };
  return { bg: 'bg-gray-500' };
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
  otherParticipantIds: string[]
): 'sent' | 'delivered' | 'read' | null {
  if (!message || !currentUserId || message.sender_id !== currentUserId) return null;
  const participantSet = new Set(otherParticipantIds);
  const others = (message.reads || []).filter((r) => participantSet.has(r.user_id));
  const need = otherParticipantIds.length;
  if (need <= 0 || others.length === 0) return 'sent';
  const readCount = others.filter((r) => !!r.read_at).length;
  const deliveredCount = others.filter((r) => !!r.delivered_at).length;
  if (readCount >= need) return 'read';
  if (deliveredCount >= need) return 'delivered';
  return 'sent';
}

type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** User ids currently typing in a conversation (excluding the current user). */
export function getTypingUserIds(
  conversation: ChatConversation | null,
  typing: Record<string, Record<string, boolean>>,
  currentUserId: string | null
): string[] {
  if (!conversation) return [];
  const convTyping = typing[conversation.id] || {};
  return Object.entries(convTyping)
    .filter(([userId, isTyping]) => isTyping && userId !== currentUserId)
    .map(([userId]) => userId);
}

/** Localized "Name is typing..." / "Name1, Name2 are typing..." label. */
export function getTypingLabel(
  typingUserIds: string[],
  users: Record<string, ChatUser>,
  t: TFunction
): string | null {
  if (typingUserIds.length === 0) return null;
  const names = typingUserIds.map((id) => getUserDisplayName(users[id])).filter(Boolean);
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} ${t('typing')}`;
  if (names.length === 2) return `${names[0]}, ${names[1]} ${t('typingMulti')}`;
  return `${names[0]} ${t('typingAndMore', { n: names.length - 1 })} ${t('typingMulti')}`;
}