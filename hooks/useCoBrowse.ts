'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { record, takeFullSnapshot } from 'rrweb';
import { useUser } from '@clerk/nextjs';
import { getSocketServerUrl } from '@/lib/socketUrl';

export interface PeerInfo {
  userId: string;
  name: string;
  imageUrl: string | null;
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [agentInfo, setAgentInfo] = useState<PeerInfo | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const cursorThrottleRef = useRef(0);
  const cursorListenerRef = useRef<((e: MouseEvent) => void) | null>(null);

  useEffect(() => {
    return () => {
      stopRecordingRef.current?.();
      if (cursorListenerRef.current) {
        window.removeEventListener('mousemove', cursorListenerRef.current);
        cursorListenerRef.current = null;
      }
      socketRef.current?.disconnect();
    };
  }, []);

  const startSupportSession = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined' || isSharing) return null;

    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    setAgentInfo(null);

    const socketUrl = getSocketServerUrl();
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = newSocket;

    console.debug(`[co-browse] client session ${newSessionId} — connecting to ${socketUrl}`);

    // Start recording ONLY after the socket is connected AND join-room has
    // been sent: this guarantees the relay receives join-room before any
    // dom-mutation-event, so broadcasts + room-buffer are never missed.
    const startRecording = () => {
      if (stopRecordingRef.current) return; // already started
      const stopRecording = record({
        ...RECORD_OPTIONS,
        emit: (event) => {
          console.debug(`[co-browse] client emit type=${event.type} room=${newSessionId}`);
          newSocket.emit('dom-mutation-event', { roomId: newSessionId, event });
        },
      });
      if (!stopRecording) {
        console.error('[co-browse] record() failed to start');
        newSocket.disconnect();
        return;
      }
      stopRecordingRef.current = stopRecording;
      console.debug(`[co-browse] recording started for room ${newSessionId}`);

      // Fresh snapshots keep long sessions self-sufficient: a new FullSnapshot
      // every 60s guarantees late-joining agents (or reconnects) always get a
      // complete DOM state even if the relay ring buffer has rolled over.
      // The timer lives for the whole session (cleared only on stop); when the
      // socket reconnects, join-room is re-sent and new events flow again.
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

    // Track the serviced user's real pointer so the agent can see it over the
    // replayed DOM (client -> agent cursor sync). Throttled to ~20/s. The
    // listener is (re)attached on every connect and removed on disconnect so
    // cursor sync survives socket reconnects.
    const onCursorMove = (e: MouseEvent) => {
      if (!newSocket.connected) return;
      const now = performance.now();
      if (now - cursorThrottleRef.current < 50) return;
      cursorThrottleRef.current = now;
      newSocket.emit('client-cursor-move', {
        roomId: newSessionId,
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    cursorListenerRef.current = onCursorMove;

    newSocket.on('connect', () => {
      console.debug('[co-browse] client socket connected');
      window.addEventListener('mousemove', onCursorMove);
      // Send the serviced user's identity so the agent page can show the
      // profile image + name of whoever is sharing their screen.
      newSocket.emit('join-room', {
        roomId: newSessionId,
        role: 'client',
        info: {
          userId: user?.id ?? '',
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.primaryEmailAddress?.emailAddress || 'Usuario',
          imageUrl: user?.imageUrl ?? null,
        },
      });
      startRecording();
    });
    newSocket.on('connect_error', (err) => {
      console.error('[co-browse] client socket connect_error:', err.message);
    });
    newSocket.on('disconnect', () => {
      window.removeEventListener('mousemove', onCursorMove);
    });

    // The relay tells us who joined on the other side (the support agent).
    newSocket.on('peer-info', (data: { role: string; info: PeerInfo }) => {
      if (data.role === 'agent' && data.info) setAgentInfo(data.info);
    });

    setSocket(newSocket);
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
    socketRef.current?.disconnect();
    socketRef.current = null;
    setAgentInfo(null);
    setSocket(null);
    setSessionId(null);
    setIsSharing(false);
  }, []);

  return {
    isSharing,
    sessionId,
    socket,
    agentInfo,
    startSupportSession,
    stopSupportSession,
  };
}