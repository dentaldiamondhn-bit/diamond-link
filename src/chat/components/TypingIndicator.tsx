'use client';

import React from 'react';
import { useChatStore } from '@/chat/store/chatStore';
import { useTranslations } from '@/chat/i18n/useTranslations';
import { getTypingUserIds, getTypingLabel } from '@/chat/utils';

interface TypingIndicatorProps {
  conversationId: string;
  className?: string;
}

/**
 * WhatsApp-style "X is typing..." indicator shown just above the composer.
 * Renders nothing while nobody is typing (broadcast-driven by the presence
 * channel via the store's `typing` map).
 */
export const TypingIndicator = ({ conversationId, className = '' }: TypingIndicatorProps) => {
  const { t } = useTranslations();
  const { conversations, users, typing, currentUserId } = useChatStore();
  const conversation = conversations.find((c) => c.id === conversationId);
  const typingUserIds = getTypingUserIds(conversation, typing, currentUserId);
  const label = getTypingLabel(typingUserIds, users, t);

  if (!label) return null;

  return (
    <div
      aria-live="polite"
      className={`flex h-6 items-center gap-2 px-4 text-xs text-gray-500 dark:text-gray-400 ${className}`}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
        <span
          className="typing-dot h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
          style={{ animationDelay: '0.15s' }}
        />
        <span
          className="typing-dot h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
          style={{ animationDelay: '0.3s' }}
        />
      </span>
      <span className="truncate italic">{label}</span>
    </div>
  );
};

export default TypingIndicator;