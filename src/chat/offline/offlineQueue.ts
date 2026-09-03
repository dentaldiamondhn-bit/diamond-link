'use client';

import type { CreateMessageData } from '@/types/chat';

/**
 * Persisted offline send queue for chat.
 *
 * When the app is offline, text messages are not failed — they are stored here
 * (in localStorage) tagged with their optimistic client id (`tmpId`). When
 * connectivity returns, the queue is flushed in order, sending each entry via
 * `ChatRepository.sendMessage` and letting the UI swap the optimistic bubble
 * for the real persisted message.
 *
 * Only text (and forward) sends are queued: file/image/voice requires a live
 * upload to produce a public URL before the message insert, which cannot be
 * completed offline.
 */

interface QueuedSend {
  tmpId: string;
  userId: string;
  data: CreateMessageData;
  queuedAt: number;
}

const KEY = 'chat-offline-queue-v1';

export function loadQueue(): QueuedSend[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedSend[]) : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedSend[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* ignore quota/private-mode errors */
  }
}

function appendItem(item: QueuedSend): QueuedSend[] {
  const next = [...loadQueue(), item];
  saveQueue(next);
  return next;
}

function removeItem(tmpId: string): QueuedSend[] {
  const next = loadQueue().filter((q) => q.tmpId !== tmpId);
  saveQueue(next);
  return next;
}

export const offlineQueue = {
  enqueue: (tmpId: string, userId: string, data: CreateMessageData): QueuedSend[] =>
    appendItem({ tmpId, userId, data, queuedAt: Date.now() }),
  remove: (tmpId: string): QueuedSend[] => removeItem(tmpId),
  list: (): QueuedSend[] => loadQueue(),
  clear: (): void => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
