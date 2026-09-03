'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { offlineQueue } from '@/chat/offline/offlineQueue';
import { ChatRepository } from '@/chat/repository';
import type { ChatMessage, CreateMessageData } from '@/types/chat';

interface FlushHandlers {
  /** Swap the optimistic queued bubble for the real persisted message. */
  onSuccess: (tmpId: string, real: ChatMessage, convId: string) => void;
  /** Mark the optimistic bubble failed (send still rejected even online). */
  onFailure: (tmpId: string) => void;
}

/**
 * Drives the chat offline send queue.
 *
 * - Detects connectivity (`navigator.onLine` + `online`/`offline` events).
 * - Exposes `queueSend` so the composer can persist a text send while offline.
 * - On reconnect, flushes the persisted queue in order through
 *   `ChatRepository.sendMessage`, routing real messages back to the store.
 */
export function useOfflineQueue({ onSuccess, onFailure }: FlushHandlers) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedCount, setQueuedCount] = useState<number>(() => offlineQueue.list().length);
  const flushingRef = useRef(false);
  const handlersRef = useRef<FlushHandlers>({ onSuccess, onFailure });
  handlersRef.current = { onSuccess, onFailure };

  // Subscribe to connectivity changes.
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const enqueue = useCallback(
    (tmpId: string, userId: string, data: CreateMessageData) => {
      offlineQueue.enqueue(tmpId, userId, data);
      setQueuedCount(offlineQueue.list().length);
    },
    []
  );

  const removeQueued = useCallback((tmpId: string) => {
    offlineQueue.remove(tmpId);
    setQueuedCount(offlineQueue.list().length);
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    const pending = offlineQueue.list();
    if (pending.length === 0) return;

    flushingRef.current = true;
    try {
      for (const item of pending) {
        try {
          const real = await ChatRepository.sendMessage(item.userId, item.data);
          if (real) {
            offlineQueue.remove(item.tmpId);
            handlersRef.current.onSuccess(item.tmpId, real, item.data.conversation_id);
          } else {
            offlineQueue.remove(item.tmpId);
            handlersRef.current.onFailure(item.tmpId);
          }
        } catch {
          // Keep it queued; will retry on the next online event.
        }
      }
    } finally {
      setQueuedCount(offlineQueue.list().length);
      flushingRef.current = false;
    }
  }, []);

  // Flush whenever we come back online.
  useEffect(() => {
    if (isOnline) void flush();
  }, [isOnline, flush]);

  return { isOnline, queuedCount, enqueue, removeQueued, flush };
}
