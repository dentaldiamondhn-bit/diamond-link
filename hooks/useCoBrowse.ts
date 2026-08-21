'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { record, takeFullSnapshot, type eventWithTime } from 'rrweb';
import { useUser } from '@clerk/nextjs';
import pako from 'pako';
import {
  createCobrowseChannel,
  broadcastEvent,
  trackPresence,
  untrackPresence,
  removeCobrowseChannel,
  uploadFullSnapshotStorage,
  type PeerInfo,
} from '@/lib/cobrowse';

export type { PeerInfo };

export interface RemoteCursor {
  x: number;
  y: number;
  percent: boolean;
  viewportWidth: number | null;
  viewportHeight: number | null;
}

export interface Ping {
  id: number;
  x: number;
  y: number;
  label: string;
}

function findScrollable(el: Element | null): Element | null {
  for (let cur: Element | null = el; cur && cur !== document.documentElement; cur = cur.parentElement) {
    const style = window.getComputedStyle(cur);
    const overflowY = style.overflowY === 'auto' || style.overflowY === 'scroll';
    const overflowX = style.overflowX === 'auto' || style.overflowX === 'scroll';
    if ((overflowY && cur.scrollHeight > cur.clientHeight) || (overflowX && cur.scrollWidth > cur.clientWidth)) {
      return cur;
    }
  }
  return null;
}

/**
 * HIPAA/PHI redaction is enforced by the recorder:
 *  - maskAllInputs: every input/textarea/select value is recorded as ***
 *  - blockClass 'rr-block' + blockSelector '[data-rr-block]': components that
 *    render patient data, medical images, the Odontogram (Tooth Chart) or
 *    clinical histories are replaced by a wireframe placeholder
 *  - recordCrossOriginIframes disabled + recordCanvas disabled so no
 *    incidental image data leaks
 */
const RECORD_OPTIONS: Parameters<typeof record>[0] = {
  maskAllInputs: true,
  blockClass: 'rr-block',
  blockSelector: '[data-rr-block]',
  recordCrossOriginIframes: false,
  recordCanvas: false,
  sampling: {
    mousemove: true,
    mouseInteraction: true,
    scroll: 150,
  },
};

export function useCoBrowse() {
  const { user } = useUser();
  const [isSharing, setIsSharing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [channelConnected, setChannelConnected] = useState(false);
  const [agentInfo, setAgentInfo] = useState<PeerInfo | null>(null);
  const [remoteCursor, setRemoteCursor] = useState<RemoteCursor | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [fullsnapshotStatus, setFullsnapshotStatus] = useState<string>('idle');
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cursorThrottleRef = useRef(0);
  const cursorListenerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const pingIdRef = useRef(0);

  useEffect(() => {
    return () => {
      stopRecordingRef.current?.();
      if (cursorListenerRef.current) {
        window.removeEventListener('mousemove', cursorListenerRef.current);
        cursorListenerRef.current = null;
      }
      if (channelRef.current) {
        untrackPresence(channelRef.current);
        removeCobrowseChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const startSupportSession = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') {
      console.log('[co-browse] startSupportSession: SSR, skipping');
      return null;
    }
    if (isSharing) {
      console.log('[co-browse] startSupportSession: already sharing, skipping');
      return null;
    }

    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    setAgentInfo(null);

    console.log(`[co-browse] client session ${newSessionId} — joining Supabase channel`);

    let lastFullSnapshot: eventWithTime | null = null;

    const uploadFullSnapshot = async (event: eventWithTime, channel: RealtimeChannel, sid: string) => {
      try {
        const json = JSON.stringify(event);
        const compressed = pako.gzip(json);
        console.log(`[co-browse] FullSnapshot: ${json.length} bytes → ${compressed.length} bytes gzip`);

        setFullsnapshotStatus('uploading...');
        const result = await uploadFullSnapshotStorage(sid, new Blob([compressed], { type: 'application/json' }));

        if ('error' in result) {
          console.warn('[co-browse] Storage upload failed, using base64 broadcast:', result.error);
          setFullsnapshotStatus('broadcasting base64...');
          const CHUNK = 32768;
          let b64 = '';
          for (let i = 0; i < compressed.length; i += CHUNK) {
            b64 += String.fromCharCode.apply(null, compressed.subarray(i, i + CHUNK));
          }
          b64 = btoa(b64);
          console.log(`[co-browse] base64 FullSnapshot: ${b64.length} chars`);
          broadcastEvent(channel, 'dom-mutation-event', { compressed: true, d: b64 });
          setFullsnapshotStatus('broadcast sent');
          return;
        }

        console.log(`[co-browse] Storage upload OK: ${result.path}`);
        setFullsnapshotStatus('reference sent');
        broadcastEvent(channel, 'fullsnapshot-reference', { path: result.path });
      } catch (err) {
        console.error('[co-browse] FullSnapshot delivery failed:', err);
        setFullsnapshotStatus(`error: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    };

    const startRecording = () => {
      if (stopRecordingRef.current) return;
      const stopRecording = record({
        ...RECORD_OPTIONS,
        emit: (event) => {
          if (!isChannelReady(ch)) return;
          console.debug(`[co-browse] client emit type=${event.type} room=${newSessionId}`);

          if (event.type === 2) {
            lastFullSnapshot = event as eventWithTime;
            void uploadFullSnapshot(event, ch, newSessionId);
          } else {
            broadcastEvent(ch, 'dom-mutation-event', { event });
          }
        },
      });
      if (!stopRecording) {
        console.error('[co-browse] record() failed to start');
        cleanupFn();
        return;
      }
      stopRecordingRef.current = stopRecording;
      console.debug(`[co-browse] recording started for room ${newSessionId}`);

      const snapshotTimer = window.setInterval(() => {
        console.debug(`[co-browse] periodic full snapshot for room ${newSessionId}`);
        takeFullSnapshot();
      }, 60000);
      const prevStop = stopRecording;
      stopRecordingRef.current = () => {
        window.clearInterval(snapshotTimer);
        prevStop();
      };
    };

    const onCursorMove = (e: MouseEvent) => {
      if (!isChannelReady(ch)) return;
      const now = performance.now();
      if (now - cursorThrottleRef.current < 50) return;
      cursorThrottleRef.current = now;
      broadcastEvent(ch, 'client-cursor-move', {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    let ch: RealtimeChannel;
    let cleanupFn: () => void;
    try {
      const result = createCobrowseChannel(newSessionId, {
        broadcastHandlers: [
          { event: 'agent-cursor-move', handler: (payload) => {
            const data = payload as {
              x: number; y: number;
              viewportWidth?: number; viewportHeight?: number;
              percentX?: number; percentY?: number;
            };
            const hasPercent = typeof data.percentX === 'number' && typeof data.percentY === 'number';
            setRemoteCursor({
              x: hasPercent ? data.percentX! : data.x,
              y: hasPercent ? data.percentY! : data.y,
              percent: hasPercent,
              viewportWidth: typeof data.viewportWidth === 'number' ? data.viewportWidth : null,
              viewportHeight: typeof data.viewportHeight === 'number' ? data.viewportHeight : null,
            });
          }},
          { event: 'agent-ping-click', handler: (payload) => {
            const data = payload as { x: number; y: number; label?: string };
            const id = ++pingIdRef.current;
            setPings((prev) => [...prev, { id, x: data.x, y: data.y, label: data.label || 'Look Here!' }]);
            setTimeout(() => {
              setPings((prev) => prev.filter((p) => p.id !== id));
            }, 2500);
          }},
          { event: 'agent-remote-click', handler: (payload) => {
            const data = payload as { x: number; y: number };
            const x = Math.min(window.innerWidth - 1, Math.max(0, (data.x / 100) * window.innerWidth));
            const y = Math.min(window.innerHeight - 1, Math.max(0, (data.y / 100) * window.innerHeight));
            const el = document.elementFromPoint(x, y);
            if (!el) return;
            for (const type of ['mousedown', 'mouseup', 'click'] as const) {
              el.dispatchEvent(
                new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 })
              );
            }
            const interactive = el.closest('input, textarea, select, [contenteditable="true"]') as HTMLElement | null;
            if (interactive && typeof interactive.focus === 'function') {
              interactive.focus();
              const input = interactive as HTMLInputElement;
              if (typeof input.select === 'function' && input.type !== 'hidden') {
                input.select();
              }
            }
          }},
          { event: 'agent-scroll', handler: (payload) => {
            const data = payload as { deltaX: number; deltaY: number; x?: number; y?: number; smooth?: boolean };
            const deltaX = data.deltaX || 0;
            const deltaY = data.deltaY || 0;
            if (!deltaX && !deltaY) return;
            const behavior: ScrollBehavior = data.smooth ? 'smooth' : 'auto';
            let target: Element | null = null;
            if (data.x !== undefined && data.y !== undefined) {
              const x = Math.min(window.innerWidth - 1, Math.max(0, (data.x / 100) * window.innerWidth));
              const y = Math.min(window.innerHeight - 1, Math.max(0, (data.y / 100) * window.innerHeight));
              target = findScrollable(document.elementFromPoint(x, y));
            }
            if (target) {
              target.scrollBy({ left: deltaX, top: deltaY, behavior });
            } else {
              window.scrollBy({ left: deltaX, top: deltaY, behavior });
            }
          }},
          { event: 'agent-remote-keypress', handler: (payload) => {
            const { type, key, code, keyCode, altKey, ctrlKey, metaKey, shiftKey } = payload as {
              type: string; key: string; code: string; keyCode: number;
              altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean;
            };
            const target = document.activeElement;
            if (!target || !(target instanceof HTMLElement)) return;
            target.dispatchEvent(
              new KeyboardEvent(type as 'keydown' | 'keyup', {
                key, code, keyCode, altKey, ctrlKey, metaKey, shiftKey,
                bubbles: true, cancelable: true, view: window,
              })
            );
          }},
        ],
        onAgentJoin: (info) => {
          console.log(`[co-browse] agent joined via Presence: ${info.name}`);
          setAgentInfo(info);
          // Re-send FullSnapshot to late-joining agent via Storage
          if (lastFullSnapshot && isChannelReady(ch)) {
            void uploadFullSnapshot(lastFullSnapshot, ch, newSessionId);
          }
          takeFullSnapshot();
        },
        onAgentLeave: () => {
          console.log('[co-browse] agent left (Presence)');
          setAgentInfo(null);
        },
        onStatusChange: (status) => {
          console.log(`[co-browse] channel status changed: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('[co-browse] client channel SUBSCRIBED');
            setChannelConnected(true);
            trackPresence(ch, 'client', {
              userId: user?.id ?? '',
              name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.primaryEmailAddress?.emailAddress || 'Usuario',
              imageUrl: user?.imageUrl ?? null,
            });
            cursorListenerRef.current = onCursorMove;
            window.addEventListener('mousemove', onCursorMove);
            startRecording();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[co-browse] channel problem: ${status}`);
            if (status === 'CLOSED') setChannelConnected(false);
          }
        },
      });
      ch = result.channel;
      cleanupFn = result.cleanup;
    } catch (err) {
      console.error('[co-browse] createCobrowseChannel failed:', err);
      return null;
    }
    channelRef.current = ch;

    setChannel(ch);
    setSessionId(newSessionId);
    setIsSharing(true);
    return newSessionId;
  }, [isSharing, user]);

  const stopSupportSession = useCallback(() => {
    stopRecordingRef.current?.();
    stopRecordingRef.current = null;
    sessionIdRef.current = null;
    if (cursorListenerRef.current) {
      window.removeEventListener('mousemove', cursorListenerRef.current);
      cursorListenerRef.current = null;
    }
    if (channelRef.current) {
      untrackPresence(channelRef.current);
      removeCobrowseChannel(channelRef.current);
      channelRef.current = null;
    }
    setAgentInfo(null);
    setChannel(null);
    setChannelConnected(false);
    setSessionId(null);
    setIsSharing(false);
  }, []);

  return {
    isSharing,
    sessionId,
    channel,
    channelConnected,
    agentInfo,
    remoteCursor,
    pings,
    fullsnapshotStatus,
    startSupportSession,
    stopSupportSession,
  };
}

/** Check if a channel is ready (subscribed) */
function isChannelReady(ch: RealtimeChannel): boolean {
  return ch.state === 'joined';
}
