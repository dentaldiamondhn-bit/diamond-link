'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useVoiceRecorder } from '@/chat/hooks/useVoiceRecorder';
import { ChatMessageType } from '@/types/chat';
import type { ChatMessage, FileAttachmentData } from '@/types/chat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import Composer from './Composer';

interface ChatPaneProps {
  className?: string;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
}

export const ChatPane = ({ className = '', sendTyping }: ChatPaneProps) => {
  const {
    selectedConversationId,
    messages,
    currentUserId,
    setMessages,
    addMessage,
    setLoading,
    setError,
    markConversationRead,
  } = useChatStore();

  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const conversationRef = useRef<string | null>(null);
  conversationRef.current = selectedConversationId;

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const { isRecording, audioBlob, audioUrl, duration, startRecording, stopRecording, reset } =
    useVoiceRecorder();

  const selectedMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  // Drop any pending reply quote when switching conversations
  useEffect(() => {
    setReplyTo(null);
  }, [selectedConversationId]);

  // Load messages when conversation changes and scroll to bottom
  useEffect(() => {
    if (!selectedConversationId || !currentUserId) return;
    const convId = selectedConversationId;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const msgs = await ChatRepository.getMessages(currentUserId, convId);
        if (!cancelled) setMessages(convId, msgs);
      } catch (err) {
        console.error('Failed to load messages:', err);
        if (!cancelled) setError('No se pudieron cargar los mensajes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId, currentUserId, setMessages, setLoading, setError]);

  // Clear "typing" flag once the user leaves the conversation or unmounts
  useEffect(() => {
    return () => {
      const convId = conversationRef.current;
      if (convId) sendTyping(convId, false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [sendTyping]);

  const handleTyping = useCallback(() => {
    const convId = conversationRef.current;
    if (!convId) return;
    sendTyping(convId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      sendTyping(convId, false);
    }, 1500);
  }, [sendTyping]);

  const handleSend = useCallback(
    async (content: string, attachments: FileAttachmentData[], replyToId?: string) => {
      const convId = conversationRef.current;
      if (!currentUserId || !convId) return;
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        sendTyping(convId, false);
      }

      let message_type = ChatMessageType.TEXT;
      if (attachments.length > 0) {
        message_type = attachments.every((a) => a.file_type.startsWith('image/'))
          ? ChatMessageType.IMAGE
          : ChatMessageType.FILE;
      }

      try {
        const message = await ChatRepository.sendMessage(currentUserId, {
          conversation_id: convId,
          content,
          message_type,
          reply_to_id: replyToId,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        if (message) {
          addMessage(message, currentUserId, convId);
          setReplyTo(null);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        setError('No se pudo enviar el mensaje');
      }
    },
    [currentUserId, addMessage, sendTyping, setError]
  );

  const handleVoiceToggle = useCallback(async () => {
    if (!currentUserId) return;
    if (isRecording) {
      await stopRecording();
      if (audioBlob && audioUrl) {
        const fileName = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webm`;
        try {
          const url = await ChatRepository.uploadVoiceNote(audioBlob, fileName);
          const convId = conversationRef.current;
          if (convId) {
            const message = await ChatRepository.sendMessage(currentUserId, {
              conversation_id: convId,
              content: '',
              message_type: ChatMessageType.VOICE,
              voice_note_url: url,
              voice_note_duration: Math.max(1, Math.round(duration)),
            });
            if (message) addMessage(message, currentUserId, convId);
          }
        } catch (err) {
          console.error('Failed to upload voice note:', err);
          setError('No se pudo subir la nota de voz');
        } finally {
          reset();
        }
      } else {
        reset();
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        console.warn('Microphone access denied:', err);
      }
    }
  }, [
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    currentUserId,
    stopRecording,
    reset,
    startRecording,
    handleSend,
    addMessage,
    setError,
  ]);

  useEffect(() => {
    if (selectedConversationId) markConversationRead(selectedConversationId);
  }, [selectedMessages.length, selectedConversationId, markConversationRead]);

  return (
    <div
      className={`flex h-full flex-1 min-w-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-800 ${className}`}
    >
      <ChatHeader conversationId={selectedConversationId} />
      <div className="flex-1 min-h-0 overflow-hidden p-4">
        <MessageList
          key={selectedConversationId ?? 'none'}
          messages={selectedMessages}
          onReplyTo={(msg) => setReplyTo(msg)}
          replyToId={replyTo?.id ?? null}
        />
      </div>
      <Composer
        conversationId={selectedConversationId}
        onSend={handleSend}
        onTyping={handleTyping}
        onVoiceToggle={handleVoiceToggle}
        isRecording={isRecording}
        duration={duration}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};

export default ChatPane;