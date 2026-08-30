'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessagesSquare } from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { ChatRepository } from '@/chat/repository';
import { useVoiceRecorder, VoiceRecordingResult } from '@/chat/hooks/useVoiceRecorder';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { ChatMessageType } from '@/types/chat';
import type { ChatMessage, FileAttachmentData } from '@/types/chat';
import type { PendingAttachment } from './AttachmentTray';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import Composer from './Composer';

interface ChatPaneProps {
  className?: string;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
}

const makeTmpId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const ChatPane = ({ className = '', sendTyping }: ChatPaneProps) => {
  const { t } = useTranslations();
  const {
    selectedConversationId,
    messages,
    conversations,
    currentUserId,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    setLoading,
    setError,
    markConversationRead,
  } = useChatStore();

  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const conversationRef = useRef<string | null>(null);
  conversationRef.current = selectedConversationId;

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pendingVoice, setPendingVoice] = useState<VoiceRecordingResult | null>(null);

  const { isRecording, isPaused, duration, startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording, reset } =
    useVoiceRecorder();

  const selectedMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  // Other participants of the selected conversation (for delivered/read states).
  const otherParticipantIds = useMemo(() => {
    if (!selectedConversationId) return [];
    const conv = conversations.find((c) => c.id === selectedConversationId);
    return (conv?.participants || [])
      .map((p) => p.user_id)
      .filter((id) => id !== currentUserId);
  }, [conversations, selectedConversationId, currentUserId]);

  // Drop any pending reply quote / staged voice when switching conversations
  useEffect(() => {
    setReplyTo(null);
    setPendingVoice((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
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

  const deriveMessageType = (items: PendingAttachment[]) => {
    if (items.length === 0) return ChatMessageType.TEXT;
    return items.every((a) => a.type.startsWith('image/'))
      ? ChatMessageType.IMAGE
      : ChatMessageType.FILE;
  };

  /** Build the local (optimistic) message that pops into the chat right away. */
  const optimisticMessage = useCallback(
    (
      tmpId: string,
      convId: string,
      content: string,
      items: PendingAttachment[],
      replyToId: string | null
    ): ChatMessage => {
      const now = new Date().toISOString();
      return {
        id: tmpId,
        conversation_id: convId,
        sender_id: currentUserId ?? '',
        content,
        message_type: deriveMessageType(items),
        reply_to_id: replyToId,
        is_edited: false,
        is_deleted: false,
        reactions: {},
        created_at: now,
        updated_at: now,
        local_state: 'pending',
        upload_progress: items.length === 0 ? 100 : 0,
        attachments: items.map((a, i) => ({
          id: `ua-${i}-${tmpId}`,
          message_id: tmpId,
          file_name: a.name,
          file_type: a.type,
          file_size: a.size,
          file_url: a.previewUrl,
          thumbnail_url: null,
          uploaded_by: currentUserId ?? '',
          created_at: now,
        })),
      };
    },
    [currentUserId]
  );

  /**
   * Remove the optimistic message and replace it with the persisted one.
   * Order matters: the realtime hook may already have inserted the real row
   * (both paths call addMessage, which dedupes by id).
   */
  const finalizeSend = useCallback(
    (tmpId: string, real: ChatMessage, convId: string) => {
      removeMessage(tmpId);
      addMessage(real, currentUserId, convId);
    },
    [removeMessage, addMessage, currentUserId]
  );

  const handleSend = useCallback(
    async (content: string, items: PendingAttachment[], replyToId?: string) => {
      const convId = conversationRef.current;
      if (!currentUserId || !convId) return;
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        sendTyping(convId, false);
      }

      const tmpId = makeTmpId('tmp');
      const optimistic = optimisticMessage(tmpId, convId, content, items, replyToId ?? null);
      addMessage(optimistic, currentUserId, convId);
      setReplyTo(null);

      try {
        // Upload files through the server route; swap each optimistic preview
        // for its real public URL as it completes and advance the % readout.
        const realAtts: FileAttachmentData[] = [];
        for (let i = 0; i < items.length; i++) {
          try {
            const result = await ChatRepository.uploadFile(items[i].file, convId);
            realAtts.push({
              file_name: result.fileName,
              file_type: result.fileType,
              file_size: result.fileSize,
              file_url: result.url,
            });
          } catch (err) {
            console.error('Failed to upload attachment:', err);
          }
          const remaining = items.slice(i + 1).map((a, j) => ({
            id: `ua-${i + 1 + j}-${tmpId}`,
            message_id: tmpId,
            file_name: a.name,
            file_type: a.type,
            file_size: a.size,
            file_url: a.previewUrl,
            thumbnail_url: null,
            uploaded_by: currentUserId,
            created_at: optimistic.created_at,
          }));
          updateMessage(tmpId, {
            attachments: [
              ...realAtts.map((r, j) => ({
                id: `ua-${j}-${tmpId}`,
                message_id: tmpId,
                file_name: r.file_name,
                file_type: r.file_type,
                file_size: r.file_size,
                file_url: r.file_url,
                thumbnail_url: null,
                uploaded_by: currentUserId,
                created_at: optimistic.created_at,
              })),
              ...remaining,
            ],
            upload_progress: items.length > 0 ? Math.round(((i + 1) / items.length) * 90) : 100,
          });
        }

        const message = await ChatRepository.sendMessage(currentUserId, {
          conversation_id: convId,
          content,
          message_type: optimistic.message_type,
          reply_to_id: replyToId ?? null,
          attachments: realAtts.length > 0 ? realAtts : undefined,
        });

        if (message) {
          finalizeSend(tmpId, message, convId);
        } else {
          updateMessage(tmpId, { local_state: 'failed' });
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        updateMessage(tmpId, { local_state: 'failed' });
        setError('No se pudo enviar el mensaje');
      }
    },
    [
      currentUserId,
      addMessage,
      updateMessage,
      optimisticMessage,
      finalizeSend,
      sendTyping,
      setError,
    ]
  );

  // ---- Voice notes -----------------------------------------------------

  const handleVoiceStart = useCallback(async () => {
    if (!currentUserId) return;
    try {
      await startRecording();
    } catch (err) {
      console.warn('Microphone access denied:', err);
    }
  }, [currentUserId, startRecording]);

  const handleVoiceStop = useCallback(async () => {
    if (!currentUserId) return;
    const result = await stopRecording();
    if (result) {
      setPendingVoice(result);
    } else {
      reset();
    }
  }, [currentUserId, stopRecording, reset]);

  const handleVoicePauseToggle = useCallback(() => {
    if (isPaused) resumeRecording();
    else pauseRecording();
  }, [isPaused, pauseRecording, resumeRecording]);

  const handleVoiceCancel = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  const handleVoiceDiscard = useCallback(() => {
    setPendingVoice((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    reset();
  }, [reset]);

  const handleVoiceSend = useCallback(async () => {
    if (!currentUserId || !pendingVoice) return;
    const result = pendingVoice;
    const convId = conversationRef.current;
    if (!convId) {
      handleVoiceDiscard();
      return;
    }

    const tmpId = makeTmpId('vtmp');
    const optimistic = optimisticMessage(tmpId, convId, '', [], null);
    optimistic.message_type = ChatMessageType.VOICE;
    optimistic.voice_note_url = result.url;
    optimistic.voice_note_duration = Math.max(1, Math.round(result.duration));
    optimistic.upload_progress = 30;
    addMessage(optimistic, currentUserId, convId);
    setPendingVoice(null);

    try {
      const type = (result.blob.type || '').toLowerCase();
      const ext = type.includes('mp4')
        ? 'm4a'
        : type.includes('aac')
          ? 'aac'
          : type.includes('ogg')
            ? 'ogg'
            : type.includes('mpeg') || type.includes('mp3')
              ? 'mp3'
              : 'webm';
      const fileName = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      updateMessage(tmpId, { upload_progress: 60 });
      const url = await ChatRepository.uploadVoiceNote(result.blob, fileName);
      updateMessage(tmpId, { upload_progress: 90 });
      URL.revokeObjectURL(result.url);

      const message = await ChatRepository.sendMessage(currentUserId, {
        conversation_id: convId,
        content: '',
        message_type: ChatMessageType.VOICE,
        voice_note_url: url,
        voice_note_duration: Math.max(1, Math.round(result.duration)),
      });
      if (message) {
        finalizeSend(tmpId, message, convId);
      } else {
        updateMessage(tmpId, { local_state: 'failed' });
      }
    } catch (err) {
      console.error('Failed to upload voice note:', err);
      updateMessage(tmpId, { local_state: 'failed' });
      setError('No se pudo subir la nota de voz');
    } finally {
      reset();
    }
  }, [
    currentUserId,
    pendingVoice,
    optimisticMessage,
    addMessage,
    updateMessage,
    finalizeSend,
    reset,
    setError,
    handleVoiceDiscard,
  ]);

  useEffect(() => {
    if (selectedConversationId) markConversationRead(selectedConversationId);
  }, [selectedMessages.length, selectedConversationId, markConversationRead]);

  return (
    <div
      className={`relative flex h-full flex-1 min-w-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-800 ${className}`}
    >
      {selectedConversationId ? (
        <>
          <ChatHeader conversationId={selectedConversationId} />
          <div className="flex-1 min-h-0 overflow-hidden p-4">
            <MessageList
              key={selectedConversationId}
              messages={selectedMessages}
              onReplyTo={(msg) => setReplyTo(msg)}
              replyToId={replyTo?.id ?? null}
              participantUserIds={otherParticipantIds}
            />
          </div>
          <TypingIndicator conversationId={selectedConversationId} />
          <Composer
            conversationId={selectedConversationId}
            onSend={handleSend}
            onTyping={handleTyping}
            onVoiceStart={handleVoiceStart}
            onVoiceStop={handleVoiceStop}
            onVoicePauseToggle={handleVoicePauseToggle}
            onVoiceCancel={handleVoiceCancel}
            onVoiceSend={handleVoiceSend}
            onVoiceDiscard={handleVoiceDiscard}
            isRecording={isRecording}
            isPaused={isPaused}
            duration={duration}
            hasPendingVoice={!!pendingVoice}
            voiceDuration={pendingVoice?.duration || 0}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <MessagesSquare className="h-10 w-10 text-gray-400 dark:text-gray-300" />
          </div>
          <div>
            <p className="text-xl font-medium text-gray-700 dark:text-gray-200">
              {t('selectConversation')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('selectConversationHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPane;