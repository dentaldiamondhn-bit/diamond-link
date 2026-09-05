'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessagesSquare, WifiOff } from 'lucide-react';
import { useChatStore } from '@/chat/store/chatStore';
import { useChatSettingsStore } from '@/chat/store/chatSettingsStore';
import { DEFAULT_WALLPAPERS, WALLPAPER_TILE } from '@/chat/wallpapers';
import { ChatRepository } from '@/chat/repository';
import { useVoiceRecorder, VoiceRecordingResult } from '@/chat/hooks/useVoiceRecorder';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { useTheme } from '@/contexts/ThemeContext';
import { ChatMessageType, CreateMessageData } from '@/types/chat';
import type { ChatMessage, FileAttachmentData } from '@/types/chat';
import type { PendingAttachment } from './AttachmentTray';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MediaLightbox from './MediaLightbox';
import TypingIndicator from './TypingIndicator';
import Composer from './Composer';
import { useOfflineQueue } from '@/chat/hooks/useOfflineQueue';

interface ChatPaneProps {
  className?: string;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  onMenuToggle?: () => void;
}

const makeTmpId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const ChatPane = ({ className = '', sendTyping, onMenuToggle }: ChatPaneProps) => {
  const { t } = useTranslations();
  const chatSettings = useChatSettingsStore((s) => s.settings);

  // Wallpaper for the chat area: a user-uploaded image (cover) or a built-in
  // default seamless design (chosen via wallpaper_style).
  const wallpaperStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (chatSettings?.wallpaper_type === 'custom' && chatSettings.background_image_url) {
      return {
        backgroundImage: `url(${chatSettings.background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return undefined;
  }, [chatSettings]);
  const { resolvedTheme } = useTheme();
  const defaultWallpaperStyle = useMemo<React.CSSProperties>(() => {
    const key = chatSettings?.wallpaper_style ?? 'classic';
    const design = DEFAULT_WALLPAPERS[key] ?? DEFAULT_WALLPAPERS.classic;
    const bg = resolvedTheme === 'dark' ? design.dark : design.light;
    return {
      backgroundImage: bg,
      backgroundSize: `${WALLPAPER_TILE}px`,
      backgroundRepeat: 'repeat',
    };
  }, [resolvedTheme, chatSettings]);
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
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pendingVoice, setPendingVoice] = useState<VoiceRecordingResult | null>(null);
  const [lightbox, setLightbox] = useState<{ msg: ChatMessage; index: number } | null>(null);

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
    setEditingMessage(null);
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

  const { isOnline, queuedCount, enqueue } = useOfflineQueue({
    onSuccess: finalizeSend,
    onFailure: (tmpId) => updateMessage(tmpId, { local_state: 'failed' }),
  });

  const handleSend = useCallback(
    async (
      content: string,
      items: PendingAttachment[],
      replyToId?: string,
      patientCaseLink?: CreateMessageData['patient_case_link']
    ) => {
      const convId = conversationRef.current;
      if (!currentUserId || !convId) return;
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        sendTyping(convId, false);
      }

      const tmpId = makeTmpId('tmp');
      const optimistic = optimisticMessage(tmpId, convId, content, items, replyToId ?? null);

      if (patientCaseLink) {
        optimistic.message_type = ChatMessageType.PATIENT_CASE;
        // Attach the link to the optimistic bubble so the card renders right
        // away with the patient snapshot (name/phone/…) instead of an empty
        // fallback while the persisted row is fetched.
        optimistic.patient_case_link =
          patientCaseLink as unknown as NonNullable<ChatMessage['patient_case_link']>;
      }

      const textOnly = items.length === 0 && !patientCaseLink;
      if (!isOnline && textOnly) {
        optimistic.local_state = 'queued';
        addMessage(optimistic, currentUserId, convId);
        setReplyTo(null);
        enqueue(tmpId, currentUserId, {
          conversation_id: convId,
          content,
          message_type: optimistic.message_type,
          reply_to_id: replyToId ?? null,
          patient_case_link: patientCaseLink,
        });
        return;
      }

      addMessage(optimistic, currentUserId, convId);
      setReplyTo(null);

      // Release the tray's preview object URLs once the outbound message is
      // replaced by (or falls back to) the persisted one. The optimistic
      // bubble still renders from these URLs until then.
      const releasePreviews = () => {
        for (const att of items) URL.revokeObjectURL(att.previewUrl);
      };

      // Live progress: storage has no per-byte callback, so while the upload
      // is in flight we nudge the % upward so the sender sees it moving.
      let progress = items.length > 0 ? 0 : 100;
      const progressTimer = window.setInterval(() => {
        if (progress >= 90) {
          window.clearInterval(progressTimer);
          return;
        }
        progress = Math.min(90, progress + 2 + Math.random() * 4);
        updateMessage(tmpId, { upload_progress: progress });
      }, 320);

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
          progress = items.length > 0 ? Math.round(((i + 1) / items.length) * 90) : 100;
          updateMessage(tmpId, { upload_progress: progress });
        }

        const message = await ChatRepository.sendMessage(currentUserId, {
          conversation_id: convId,
          content,
          message_type: optimistic.message_type,
          reply_to_id: replyToId ?? null,
          attachments: realAtts.length > 0 ? realAtts : undefined,
          patient_case_link: patientCaseLink,
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
      } finally {
        window.clearInterval(progressTimer);
        releasePreviews();
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
      isOnline,
      enqueue,
    ]
  );

  // ---- Editing ---------------------------------------------------------

  /** Confirm an edit made in the bottom composer: apply it optimistically to
   *  the local thread, clear the edit session, then persist to the server. */
  const handleEditConfirm = useCallback(
    async (content: string, msg: ChatMessage) => {
      if (!currentUserId) return;
      updateMessage(msg.id, {
        content,
        is_edited: true,
        updated_at: new Date().toISOString(),
      });
      setEditingMessage(null);
      try {
        await ChatRepository.updateMessage(currentUserId, msg.id, { content });
      } catch (err) {
        console.error('Failed to update message:', err);
      }
    },
    [currentUserId, updateMessage]
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

    let progress = 30;
    const progressTimer = window.setInterval(() => {
      if (progress >= 88) {
        window.clearInterval(progressTimer);
        return;
      }
      progress = Math.min(88, progress + 2 + Math.random() * 4);
      updateMessage(tmpId, { upload_progress: progress });
    }, 280);

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
      window.clearInterval(progressTimer);
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

  const handleOpenLightbox = useCallback((msg: ChatMessage, index: number) => {
    setLightbox({ msg, index });
  }, []);

  useEffect(() => {
    if (selectedConversationId) markConversationRead(selectedConversationId);
  }, [selectedMessages.length, selectedConversationId, markConversationRead]);

  return (
    <div
      style={
        wallpaperStyle ?? defaultWallpaperStyle
      }
      className={`relative flex h-full flex-1 min-w-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-800 ${className}`}
    >
      {(isOnline === false || queuedCount > 0) && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
          <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {isOnline === false
              ? queuedCount > 0
                ? t('queuedMessages', { n: queuedCount })
                : t('offlineBanner')
              : t('queuedMessages', { n: queuedCount })}
          </span>
        </div>
      )}
      {selectedConversationId ? (
        <>
          <ChatHeader conversationId={selectedConversationId} onMenuToggle={onMenuToggle} />
          <div className="flex-1 min-h-0 overflow-hidden p-4">
            <MessageList
              key={selectedConversationId}
              messages={selectedMessages}
              onReplyTo={(msg) => setReplyTo(msg)}
              replyToId={replyTo?.id ?? null}
              participantUserIds={otherParticipantIds}
              onOpenLightbox={handleOpenLightbox}
              onEditMessage={(msg) => setEditingMessage(msg)}
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
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onEditConfirm={handleEditConfirm}
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

      {lightbox && (
        <MediaLightbox
          items={(lightbox.msg.attachments || []).filter(
            (a) => a.file_type.startsWith('image/') || a.file_type.startsWith('video/')
          )}
          index={lightbox.index}
          onIndexChange={(index) => setLightbox({ msg: lightbox.msg, index })}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
};

export default ChatPane;