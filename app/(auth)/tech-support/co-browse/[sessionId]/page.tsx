'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { io, type Socket } from 'socket.io-client';
import { Replayer, type eventWithTime } from 'rrweb';
import { supabase } from '@/lib/supabase';
import { hasOverrideRole } from '@/lib/adminAuth';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';

export default function CoBrowseAgentPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? '';
  const router = useRouter();
  const { sessionClaims, userId } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const recordingRef = useRef<eventWithTime[]>([]);

  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [pingMode, setPingMode] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isPrivileged = hasOverrideRole(sessionClaims, userId);

  const onReplayEvent = useCallback((event: eventWithTime) => {
    replayerRef.current?.addEvent(event);
    recordingRef.current.push(event);
    setEventCount((n) => n + 1);
  }, []);

  const onRoomBuffer = useCallback(
    ({ events }: { events: eventWithTime[] }) => {
      for (const event of events) onReplayEvent(event);
    },
    [onReplayEvent]
  );

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { roomId: sessionId, role: 'agent' });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('replay-event', onReplayEvent);
    socket.on('room-buffer', onRoomBuffer);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, onReplayEvent, onRoomBuffer]);

  // Bootstrap the live Replayer once the container is mounted.
  useEffect(() => {
    if (!containerRef.current) return;
    const replayer = new Replayer([], {
      root: containerRef.current,
      liveMode: true,
      autoPlay: false,
      width: '100%',
      height: '100%',
    });
    replayer.startLive();
    replayerRef.current = replayer;

    return () => {
      replayerRef.current = null;
    };
  }, []);

  // Begin recording playback once the relay is connected. Kept separate from
  // the replayer bootstrap so reconnects never rebuild the mirrored state.
  useEffect(() => {
    if (!connected) return;
    replayerRef.current?.play();
    setRecording(true);
  }, [connected]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      socket.emit('agent-cursor-move', {
        roomId: sessionId,
        x: e.clientX,
        y: e.clientY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    },
    [sessionId]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const socket = socketRef.current;
      if (!pingMode || !socket?.connected) return;
      socket.emit('agent-ping-click', {
        roomId: sessionId,
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
        label: 'Look Here!',
      });
    },
    [pingMode, sessionId]
  );

  const exportRecording = useCallback(() => {
    if (recordingRef.current.length === 0) return;
    const blob = new Blob([JSON.stringify(recordingRef.current)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `support_session_${sessionId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionId]);

  const uploadRecording = useCallback(async () => {
    if (recordingRef.current.length === 0) return;
    setUploading(true);
    setUploadedUrl(null);
    setError(null);
    try {
      const fileName = `support_session_${sessionId}_${Date.now()}.json`;
      const { error: uploadError } = await supabase.storage
        .from('support-sessions')
        .upload(fileName, new Blob([JSON.stringify(recordingRef.current)], { type: 'application/json' }), {
          contentType: 'application/json',
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('support-sessions').getPublicUrl(fileName);
      setUploadedUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo la grabación.');
    } finally {
      setUploading(false);
    }
  }, [sessionId]);

  if (!isPrivileged) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-user-shield text-5xl text-gray-300" />
          <p className="mt-4 font-semibold text-gray-700">Acceso restringido</p>
          <p className="text-sm text-gray-500">
            Solo el personal de soporte técnico puede ver esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Co-Browsing en Vivo</h1>
            <p className="text-xs text-gray-500">
              Sesión: <code className="rounded bg-gray-200 px-1 py-0.5">{sessionId}</code>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
              {eventCount} eventos
            </span>
            <button
              type="button"
              onClick={() => setPingMode((m) => !m)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                pingMode
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'
              }`}
            >
              <i className="fas fa-bullseye mr-1.5" />
              {pingMode ? 'Ping activo — clic en el video' : 'Modo Ping'}
            </button>
            <button
              type="button"
              onClick={exportRecording}
              disabled={recordingRef.current.length === 0}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-40"
            >
              <i className="fas fa-download mr-1.5" />
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={uploadRecording}
              disabled={uploading || recordingRef.current.length === 0}
              className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              <i className={`fas fa-cloud-upload-alt mr-1.5 ${uploading ? 'animate-spin' : ''}`} />
              {uploading ? 'Subiendo...' : 'Subir a Supabase'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/tech-support')}
              className="rounded-full bg-gray-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-900"
            >
              <i className="fas fa-arrow-left mr-1.5" />
              Salir
            </button>
          </div>
        </div>

        {!connected && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
            <i className="fas fa-hourglass-half" />
            Esperando conexión del cliente con la sesión compartida…
          </div>
        )}
        {recording && (
          <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
            <i className="fas fa-record-vinyl mr-1.5" />
            Grabando sesión — {recordingRef.current.length} eventos capturados.
          </div>
        )}
        {uploadedUrl && (
          <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
            <i className="fas fa-check-circle mr-1.5" />
            Grabación subida:{' '}
            <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="underline">
              ver archivo
            </a>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            <i className="fas fa-exclamation-triangle mr-1.5" />
            {error}
          </div>
        )}

        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className={`aspect-video w-full overflow-hidden rounded-xl bg-white shadow ring-1 ring-gray-200 ${
            pingMode ? 'cursor-crosshair' : 'cursor-none'
          }`}
        />
      </div>
    </div>
  );
}