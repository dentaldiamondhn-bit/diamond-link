import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/chat/store/chatStore';
import type { ChatMessage } from '@/types/chat';

/**
 * Hook to set up realtime subscriptions for a given conversation.
 * It listens for new messages, updates, and presence events.
 * Updates the store accordingly.
 */
export const useChatRealtime = (conversationId: string | null) => {
  const { setMessages, addMessage, updateMessage, addOrUpdateUser } = useChatStore();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!conversationId) return;

    // 1. Messages changes (INSERT, UPDATE)
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          addMessage(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          const old = payload.old as ChatMessage;
          // Update the message in store
          updateMessage(updated.id, {
            content: updated.content,
            is_edited: updated.is_edited,
            voice_note_url: updated.voice_note_url,
            voice_note_duration: updated.voice_note_duration,
            // reactions? we'll handle separately if needed
          });
        }
      )
      .subscribe();

    // 2. Presence: typing and online status
    const presenceChannel = supabase
      .channel(`presence-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_presence',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const presence = payload.new as {
            user_id: string;
            status: 'online' | 'typing';
            updated_at: string;
          };
          // We could store presence in store, but for simplicity we just update user status
          // Assuming we have a user in store with id
          addOrUpdateUser({
            id: presence.user_id,
            name: '', // We'll need to fetch name elsewhere; for now placeholder
            online: presence.status === 'online',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_presence',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const presence = payload.new as {
            user_id: string;
            status: 'online' | 'typing';
            updated_at: string;
          };
          addOrUpdateUser({
            id: presence.user_id,
            name: '',
            online: presence.status === 'online',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_presence',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const presence = payload.old as {
            user_id: string;
          };
          // Mark user as offline
          addOrUpdateUser({
            id: presence.user_id,
            name: '',
            online: false,
          });
        }
      )
      .subscribe();

    // 3. Conversation updates (e.g., last message, unread count)
    const convChannel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          // We could update the conversation in store, but we rely on last message via messages channel
          // For now, we do nothing; the store's conversation list is refreshed elsewhere
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(convChannel);
    };
  }, [conversationId, setMessages, addMessage, updateMessage, addOrUpdateUser]);

  // Return a function to send a presence update (typing)
  const sendPresence = useCallback(
    async (status: 'online' | 'typing') => {
      if (!conversationId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert presence record
      await supabase
        .from('chat_presence')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: user.id,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: ['conversation_id', 'user_id'] }
        );
    },
    [conversationId]
  );

  return { sendPresence };
};