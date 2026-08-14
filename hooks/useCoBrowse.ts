'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { record } from 'rrweb';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';

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
  const [isSharing, setIsSharing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      stopRecordingRef.current?.();
      socketRef.current?.disconnect();
    };
  }, []);

  const startSupportSession = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined' || isSharing) return null;

    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = newSocket;

    const stopRecording = record({
      ...RECORD_OPTIONS,
      emit: (event) => {
        newSocket.emit('dom-mutation-event', { roomId: newSessionId, event });
      },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId: newSessionId, role: 'client' });
    });

    if (!stopRecording) {
      newSocket.disconnect();
      socketRef.current = null;
      return null;
    }

    stopRecordingRef.current = stopRecording;
    setSocket(newSocket);
    setSessionId(newSessionId);
    setIsSharing(true);
    return newSessionId;
  }, [isSharing]);

  const stopSupportSession = useCallback(() => {
    stopRecordingRef.current?.();
    stopRecordingRef.current = null;
    sessionIdRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSocket(null);
    setSessionId(null);
    setIsSharing(false);
  }, []);

  return {
    isSharing,
    sessionId,
    socket,
    startSupportSession,
    stopSupportSession,
  };
}