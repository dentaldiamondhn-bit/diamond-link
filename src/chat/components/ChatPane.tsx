'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/chat/store/chatStore';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import Composer from './Composer';
import { useChatRealtime } from '@/chat/hooks/useChatRealtime';
import { useVoiceRecorder } from '@/chat/hooks/useVoiceRecorder';
import { ChatRepository } from '@/chat/repository';

export const ChatPane = () => {
  const {
    selectedConversationId,
    messages: storeMessages,
    users,
    setLoading,
    setError,
    setMessages, // Action to set messages for a conversation
  } = useChatStore();
  const [scrollToBottom, setScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { sendPresence } = useChatRealtime(selectedConversationId);
  const { isRecording, audioBlob, audioUrl, duration, startRecording, stopRecording, reset } =
    useVoiceRecorder();

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!selectedConversationId) return;
    const loadMessages = async () => {
      try {
        setLoading(true);
        const messages = await ChatRepository.getMessages(selectedConversationId);
        // Update the store with the messages for this conversation
        setMessages(selectedConversationId, messages);
        // Scroll to bottom
        setScrollToBottom(true);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [selectedConversationId, setLoading, setMessages, scrollToBottom]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setScrollToBottom(false);
    }
  }, [scrollToBottom, storeMessages]);

  // Update presence when component mounts/unmounts
  useEffect(() => {
    if (!selectedConversationId) return;
    sendPresence('online');
    return () => {
      sendPresence('offline');
    };
  }, [selectedConversationId, sendPresence]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!selectedConversationId) return;
    
    ChatRepository.setTyping(selectedConversationId, true).catch(console.error);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      ChatRepository.setTyping(selectedConversationId, false).catch(console.error);
    }, 1000);
  }, [selectedConversationId]);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle sending a message (text or voice)
  const handleSendMessage = async (content: string, attachments: any[]) => {
    if (!selectedConversationId) return;
    try {
      setLoading(true);
      const messageData: any = {
        conversation_id: selectedConversationId,
        content,
        message_type: attachments.length > 0 ? (attachments[0].type === 'voice' ? 'VOICE' : 'FILE') : 'TEXT',
        attachments,
      };

      if (attachments.some((a) => a.type === 'voice')) {
        const voiceAttachment = attachments.find((a) => a.type === 'voice');
        messageData.voice_note_url = voiceAttachment.url;
        messageData.voice_note_duration = voiceAttachment.duration;
      }

      await ChatRepository.sendMessage(messageData);
      if (isRecording) {
        await stopRecording();
        reset();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Handle voice recording toggle
  const handleVoiceToggle = async () => {
    if (isRecording) {
      await stopRecording();
      if (audioBlob && audioUrl) {
        const fileName = `voice-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}.webm`;
        try {
          const url = await ChatRepository.uploadVoiceNote(audioBlob, fileName);
          await handleSendMessage('', [
            {
              type: 'voice',
              url,
              name: 'voice_note.webm',
              duration,
            },
          ]);
        } catch (err) {
          console.error('Failed to upload voice note:', err);
          setError('Failed to upload voice note');
        } finally {
          reset();
        }
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        console.warn('Microphone access denied:', err);
      }
    }
  };

  return (
    <div className="chat-pane flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-800">
      <ChatHeader conversationId={selectedConversationId} className="border-b border-gray-200 dark:border-gray-700" />
      <div className="flex-1 overflow-hidden">
        <div className="relative flex-1 w-full overflow-y-auto p-4 space-y-4">
          <MessageList messages={storeMessages[selectedConversationId] || []} />
          <div ref={messagesEndRef} />
        </div>
      </div>
      <Composer
        onSend={handleSendMessage}
        onVoiceToggle={handleVoiceToggle}
        isRecording={isRecording}
        audioUrl={audioUrl}
        duration={duration}
        className="border-t border-gray-200 dark:border-gray-700"
      />
    </div>
  );
};

export default ChatPane;