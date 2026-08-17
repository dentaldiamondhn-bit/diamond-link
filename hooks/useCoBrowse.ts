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
  type PeerInfo,
} from '@/lib/cobrowse';


export type { PeerInfo };

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
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cursorThrottleRef = useRef(0);
  const cursorListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

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

    const startRecording = () => {
      if (stopRecordingRef.current) return;
      const stopRecording = record({
        ...RECORD_OPTIONS,
        emit: (event) => {
          if (!isChannelReady(ch)) return;
          console.debug(`[co-browse] client emit type=${event.type} room=${newSessionId}`);

          if (event.type === 2) {
            lastFullSnapshot = event as eventWithTime;
            const compressed = pako.gzip(JSON.stringify(event));
            console.log(`[co-browse] FullSnapshot compressed: ${JSON.stringify(event).length} → ${compressed.length} bytes`);
            broadcastEvent(ch, 'dom-mutation-event', { compressed: true, d: Array.from(compressed) });
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
        onAgentJoin: (info) => {
          console.log(`[co-browse] agent joined via Presence: ${info.name}`);
          setAgentInfo(info);
          // Re-send FullSnapshot to late-joining agent
          if (lastFullSnapshot && isChannelReady(ch)) {
            const compressed = pako.gzip(JSON.stringify(lastFullSnapshot));
            broadcastEvent(ch, 'dom-mutation-event', { compressed: true, d: Array.from(compressed) });
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
            setChannelConnected(false);
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
    startSupportSession,
    stopSupportSession,
  };
}

/** Check if a channel is ready (subscribed) */
function isChannelReady(ch: RealtimeChannel): boolean {
  return ch.state === 'joined';
}
