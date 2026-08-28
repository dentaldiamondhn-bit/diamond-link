import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/chat/store/chatStore';
import type { ChatMessage } from '@/types/chat';

type PresenceEntry = { user_id: string; status: 'online' | 'offline' };

/**
 * Consolidated realtime layer for the chat.
 *
 * Strategy (per the revised plan):
 * - ONE global channel for `chat_messages` (INSERT/UPDATE/DELETE) that feeds the
 *   store for every conversation the user has access to (RLS-filtered upstream).
 * - ONE global channel for `chat_conversations` + `chat_participants` that tells
 *   the layout to refresh its conversation list.
 * - ONE presence channel (Realtime Presence API + broadcast) for online/offline
 *   dots and the typing indicator. No `chat_presence` DB rows are used.
 */
export const useChatRealtime = (
  selectedConversationId: string | null,
  currentUserId: string | null,
  onConversationsChanged?: () => void,
  onIncomingMessage?: (message: ChatMessage) => void
) => {
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setPresence = useChatStore((s) => s.setPresence);
  const setTyping = useChatStore((s) => s.setTyping);

  const selectedRef = useRef(selectedConversationId);
  const currentUserRef = useRef(currentUserId);
  const onConversationsChangedRef = useRef(onConversationsChanged);
  const onIncomingRef = useRef(onIncomingMessage);
  const presenceKeyToUser = useRef(new Map<string, string>());

  // Keep the "latest value" refs in sync without writing during render.
  useEffect(() => {
    selectedRef.current = selectedConversationId;
    currentUserRef.current = currentUserId;
    onConversationsChangedRef.current = onConversationsChanged;
    onIncomingRef.current = onIncomingMessage;
  }, [selectedConversationId, currentUserId, onConversationsChanged, onIncomingMessage]);

  useEffect(() => {
    if (!currentUserId) return;

    // 1. Messages: INSERT / UPDATE / DELETE across all accessible conversations.
    const msgChannel = supabase
      .channel('chat-msg-global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' } as const,
        (payload: any) => {
          const message = payload.new;
          if (!message || !message.id) return;
          addMessage(message, currentUserRef.current, selectedRef.current);
          if (message.sender_id !== currentUserRef.current) {
            onIncomingRef.current?.(message);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' } as const,
        (payload: any) => {
          const message = payload.new;
          if (!message || !message.id) return;
          if (message.is_deleted) {
            removeMessage(message.id);
            return;
          }
          updateMessage(message.id, {
            content: message.content,
            is_edited: message.is_edited,
            is_deleted: message.is_deleted,
            reactions: message.reactions,
            voice_note_url: message.voice_note_url,
            voice_note_duration: message.voice_note_duration,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' } as const,
        (payload: any) => removeMessage(payload?.old?.id)
      )
      .subscribe();

    // 2. Conversations changes → refresh list.
    const convChannel = supabase
      .channel('chat-convs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' } as const,
        () => onConversationsChangedRef.current?.()
      )
      .subscribe();

    // 3. New participant added to me → refresh list.
    const partChannel = supabase
      .channel('chat-parts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${currentUserId}`,
        } as const,
        () => onConversationsChangedRef.current?.()
      )
      .subscribe();

    // 4. Presence: online/offline + typing (broadcast).
    // Realtime presence keys map to the socket; keep a key->userId map so
    // 'leave' events (which drop the payload) can resolve who went offline.
    const presenceChannel = supabase.channel('chat-presence');
    presenceChannel
      .on('presence', { event: 'join' }, ({ key, newPresence }: any) => {
        if (newPresence?.user_id) {
          presenceKeyToUser.current.set(key ?? newPresence.user_id, newPresence.user_id);
          setPresence(newPresence.user_id, newPresence.status === 'online' ? 'online' : 'offline');
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        const userId = presenceKeyToUser.current.get(key) ?? key;
        presenceKeyToUser.current.delete(key);
        if (userId && userId !== currentUserRef.current) setPresence(userId, 'offline');
      })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceEntry>();
        presenceKeyToUser.current.clear();
        for (const [key, entries] of Object.entries(state)) {
          for (const p of entries) {
            if (p?.user_id) {
              presenceKeyToUser.current.set(key, p.user_id);
              setPresence(p.user_id, p.status === 'online' ? 'online' : 'offline');
            }
          }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (!payload?.user_id || !payload?.conversation_id) return;
        if (payload.user_id === currentUserRef.current) return;
        setTyping(payload.conversation_id, payload.user_id, Boolean(payload.is_typing));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && currentUserRef.current) {
          presenceChannel.track({ user_id: currentUserRef.current, status: 'online' });
        }
      });

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
      supabase.removeChannel(partChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUserId, setPresence, setTyping, addMessage, updateMessage, removeMessage]);

  /** Broadcast typing state to everyone on the presence channel */
  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    const userId = currentUserRef.current;
    if (!userId) return;
    supabase
      .channel('chat-presence')
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: userId,
          conversation_id: conversationId,
          is_typing: isTyping,
        },
      })
      .catch(() => {});
  }, []);

  return { sendTyping };
};