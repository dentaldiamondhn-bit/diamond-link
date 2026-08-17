'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Replayer, type eventWithTime } from 'rrweb';
import 'rrweb/dist/style.css';
import { supabase } from '@/lib/supabase';
import { hasOverrideRole } from '@/lib/adminAuth';
import {
  createCobrowseChannel,
  broadcastEvent,
  trackPresence,
  untrackPresence,
  removeCobrowseChannel,
  isChannelReady,
  type PeerInfo,
} from '@/lib/cobrowse';
import { AgentCursorOverlay } from '@/components/support/AgentCursorOverlay';
import type { RealtimeChannel } from '@supabase/supabase-js';
import pako from 'pako';

interface RecordedViewport {
  width: number;
  height: number;
}

export default function CoBrowseAgentPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? '';
  const router = useRouter();
  const { sessionClaims, userId } = useAuth();
  const { user } = useUser();

  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const recordingRef = useRef<eventWithTime[]>([]);
  const recordedViewportRef = useRef<RecordedViewport | null>(null);

  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [firstEventType, setFirstEventType] = useState<number | null>(null);
  const [lastEventType, setLastEventType] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [channelState, setChannelState] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [pingMode, setPingMode] = useState(false);
  const [controlMode, setControlMode] = useState(false);
  const [clientCursor, setClientCursor] = useState<{ left: number; top: number } | null>(null);
  const [clientInfo, setClientInfo] = useState<PeerInfo | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const sessionStartTimeRef = useRef<number>(Date.now());

  const isPrivileged = hasOverrideRole(sessionClaims, userId);

  const pendingEventsRef = useRef<eventWithTime[]>([]);
  const replayerReadyRef = useRef(false);
  const cursorThrottleRef = useRef(0);

  const onReplayEvent = useCallback((event: eventWithTime) => {
    setRecording(true);
    setFirstEventType((t) => t ?? event.type);
    setLastEventType(event.type);

    // Track the recorded viewport dimensions (Meta event, type 4, or a
    // ViewportResize incremental event, source 4). These tell us the client's
    // page size so we can scale the iframe to fit and map coordinates back to
    // the client's window accurately.
    if (event.type === 4 && event.data?.width) {
      recordedViewportRef.current = { width: event.data.width, height: event.data.height };
    } else if (event.type === 3 && event.data?.source === 4 && event.data?.width) {
      recordedViewportRef.current = { width: event.data.width, height: event.data.height };
    }

    // Buffer ALL events until we receive a FullSnapshot (type 2).
    // Supabase Realtime broadcast does not guarantee ordering — chunked
    // events (the ~800 KB FullSnapshot) may arrive AFTER small incremental
    // mutations. Feeding mutations before the DOM tree exists causes
    // "Node with id not found" errors and a blank viewport.
    const replayer = replayerRef.current;
    if (replayer && replayerReadyRef.current) {
      replayer.addEvent(event);
    } else if (replayer && !replayerReadyRef.current) {
      pendingEventsRef.current.push(event);
      setQueuedCount(pendingEventsRef.current.length);

      // Check if we now have a FullSnapshot — if so, flush the buffer
      // (including everything queued before it) in order.
      const hasSnapshot = pendingEventsRef.current.some((e) => e.type === 2);
      if (hasSnapshot) {
        const queued = pendingEventsRef.current;
        pendingEventsRef.current = [];
        setQueuedCount(0);
        console.log(`[co-browse] FullSnapshot received, flushing ${queued.length} queued events`);
        for (const evt of queued) replayer.addEvent(evt);
      }
    }
    recordingRef.current.push(event);
    setEventCount((n) => n + 1);
    console.debug(`[co-browse] replay event type=${event.type} queued=${pendingEventsRef.current.length}`);
  }, []);

  // Normalize a pointer position against the visible (scaled + centered)
  // replayer box. The rrweb iframe is letterboxed inside the container, so the
  // client's viewport maps 1:1 to the .replayer-wrapper box only. Computing
  // percent against the wrapper's bounding rect (NOT the browser window or the
  // bare container) keeps coordinates aligned at the edges and lets the remote
  // cursor reach the user's exact screen borders. Values are clamped to
  // [0,100] so clicks/cursor in the letterbox margins stick to the border
  // instead of producing coordinates outside the client's viewport.
  const getWrapperPoint = useCallback((e: { clientX: number; clientY: number }) => {
    const container = containerRef.current;
    if (!container) return null;
    const wrapper = container.querySelector('.replayer-wrapper') as HTMLElement | null;
    const box = wrapper ?? container;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const onDomMutation = (payload: Record<string, unknown>) => {
      // Compressed FullSnapshot fallback: client sends gzip bytes as
      // Uint8Array-like `d` field with `compressed: true` flag.
      if (payload.compressed && Array.isArray(payload.d)) {
        try {
          const bytes = new Uint8Array(payload.d);
          const json = pako.ungzip(bytes, { to: 'string' });
          const event = JSON.parse(json) as eventWithTime;
          console.log(`[co-browse] compressed FullSnapshot received via broadcast (${bytes.length} bytes → ${json.length} chars)`);
          onReplayEvent(event);
          return;
        } catch (err) {
          console.error('[co-browse] failed to decompress FullSnapshot broadcast', err);
          return;
        }
      }
      const event = payload.event as eventWithTime;
      if (event) onReplayEvent(event);
    };

    const onFullsnapshotRef = async (payload: Record<string, unknown>) => {
      const path = payload.path as string;
      if (!path) return;
      console.log(`[co-browse] FullSnapshot reference received: ${path}`);
      try {
        const { data, error: dlError } = await supabase.storage
          .from('support-sessions')
          .download(path);
        if (dlError) {
          console.error(`[co-browse] FullSnapshot download failed: status=${dlError.statusCode} message="${dlError.message}" name="${dlError.name}" path="${path}"`);
          return;
        }
        const isGzipped = path.endsWith('.gz');
        let text: string;
        if (isGzipped) {
          const bytes = new Uint8Array(await data.arrayBuffer());
          text = pako.ungzip(bytes, { to: 'string' });
        } else {
          text = await data.text();
        }
        const event = JSON.parse(text) as eventWithTime;
        console.log(`[co-browse] FullSnapshot fetched (${text.length} chars${isGzipped ? ', gzipped' : ''}), feeding to replayer`);
        onReplayEvent(event);
      } catch (err) {
        console.error('[co-browse] FullSnapshot fetch error:', err);
      }
    };

    const onClientCursor = (payload: Record<string, unknown>) => {
      const data = payload as { x: number; y: number };
      const containerEl = containerRef.current;
      const wrapper = containerEl?.querySelector('.replayer-wrapper') as HTMLElement | null;
      if (containerEl && wrapper) {
        const containerRect = containerEl.getBoundingClientRect();
        const rect = wrapper.getBoundingClientRect();
        setClientCursor({
          left: (data.x / 100) * rect.width + (rect.left - containerRect.left),
          top: (data.y / 100) * rect.height + (rect.top - containerRect.top),
        });
      } else {
        setClientCursor(null);
      }
    };

    const { channel } = createCobrowseChannel(sessionId, {
      broadcastHandlers: [
        { event: 'dom-mutation-event', handler: onDomMutation },
        { event: 'fullsnapshot-reference', handler: onFullsnapshotRef },
        { event: 'client-cursor-move', handler: onClientCursor },
      ],
      onClientJoin: (info) => {
        console.log(`[co-browse] client joined via Presence: ${info.name}`);
        setClientInfo(info);
        setConnected(true);
      },
      onClientLeave: () => {
        console.log('[co-browse] client left (Presence)');
        setClientInfo(null);
        setClientCursor(null);
        setConnected(false);
        if (recordingRef.current.length > 0) {
          setSessionEnded(true);
          setPingMode(false);
          setControlMode(false);
        }
      },
      onStatusChange: (status) => {
        setChannelState(status);
        if (status === 'SUBSCRIBED') {
          console.log(`[co-browse] agent channel subscribed, joining room ${sessionId}`);
          trackPresence(channel, 'agent', {
            userId: userId ?? '',
            name:
              [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
              user?.primaryEmailAddress?.emailAddress ||
              'Soporte',
            imageUrl: user?.imageUrl ?? null,
          });
          setConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
          setClientCursor(null);
          console.warn(`[co-browse] channel problem: ${status}`);
        }
      },
    });
    channelRef.current = channel;

    return () => {
      untrackPresence(channel);
      removeCobrowseChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, onReplayEvent, userId, user]);

  // Bootstrap the live Replayer once the container is mounted.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // UNSAFE_replayCanvas: true selects the "allow-same-origin allow-scripts"
    // iframe sandbox path inside rrweb (see Replayer.setupDom / line ~16407
    // of dist/rrweb.js). Without it, the default createSandboxedIframe path
    // uses sandbox="allow-same-origin" with NO "allow-scripts", so when the
    // rebuilt DOM inserts <script> elements from the recorded page the browser
    // raises "Blocked script execution" and the iframe's layout never fully
    // renders — the agent sees a blank viewport.
    //
    // This is safe because recordCanvas:false (useCoBrowse.ts) means no canvas
    // data is captured or replayed; the flag is used here only to select the
    // non-sandboxed iframe creation path so the browser can process <script>
    // DOM nodes during rebuild. rrweb replaces all script content with
    // "SCRIPT_PLACEHOLDER" during serialization, so no user code executes.
    //
    // pauseAnimation:false prevents rrweb from injecting
    // "animation-play-state:paused" CSS for the rrweb-paused class that is
    // always added in live mode (state=="live" !== "playing"), avoiding any
    // rendering interference from animation suppression.
    const replayer = new Replayer([], {
      root: container,
      liveMode: true,
      UNSAFE_replayCanvas: true,
      pauseAnimation: false,
    });
    replayerRef.current = replayer;
    replayer.startLive();

    // Scale the replayed page to fit the container (it is recorded at the
    // client's full viewport size). Without this the iframe keeps the client's
    // pixel size and gets cropped by the overflow-hidden container; with the
    // transform the whole DOM is visible AND the coordinate mapping between the
    // agent's viewport and the serviced user's window becomes proportional.
    //
    // IMPORTANT: the wrapper is a block element so its base width defaults to
    // the container width (not the recorded viewport width), while its base
    // height comes from the iframe (= recorded viewport height). If we apply
    // scale against the recorded viewport to a differently-sized wrapper box,
    // the scaled rect does NOT match the visible iframe — breaking coordinate
    // mapping and edge reachability. Fix: explicitly size the wrapper to the
    // recorded viewport so scale and rect reflect the visible page exactly.
    const fitToContainer = () => {
      const container = containerRef.current;
      if (!container) return;
      const wrapper = container.querySelector('.replayer-wrapper') as HTMLElement | null;
      const viewport = recordedViewportRef.current;
      if (!wrapper || !viewport?.width || !viewport?.height) return;
      // Explicitly set the wrapper box to match the recorded viewport before
      // scaling — otherwise the wrapper stays container-width (block default)
      // and the scaled rect diverges from the actual iframe.
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;
      const scale = Math.min(
        (container.clientWidth - 4) / viewport.width,
        (container.clientHeight - 4) / viewport.height,
        1
      );
      const scaledW = viewport.width * scale;
      const scaledH = viewport.height * scale;
      wrapper.style.transformOrigin = 'top left';
      wrapper.style.transform = `scale(${Math.max(scale, 0.1)})`;
      wrapper.style.left = `${(container.clientWidth - scaledW) / 2}px`;
      wrapper.style.top = `${(container.clientHeight - scaledH) / 2}px`;
    };

    // The Replayer attaches its iframe with display:none; it only gets
    // dimensions when rrweb processes a Meta event (type 4), which emits
    // 'resize'. The very first event is fed directly to addEvent() in
    // onReplayEvent (the bootstrapping path) so rrweb can process the Meta
    // and emit 'resize'. Events arriving between that bootstrap call and
    // the 'resize' callback are queued here and flushed once the iframe
    // has dimensions.
    //
    // We do NOT call replayer.play(): this is a live session, so the
    // state machine must stay in the 'live' state. Calling play() would
    // switch to 'playing' mode and alter how events are dispatched
    // (timeline/timer vs. immediate sync), corrupting the live stream.
    let flushed = false;
    const flush = (dim?: { width: number; height: number }) => {
      if (dim?.width && dim?.height) {
        recordedViewportRef.current = { width: dim.width, height: dim.height };
      }
      fitToContainer();
      if (flushed) return;
      flushed = true;
      replayerReadyRef.current = true;
      setQueuedCount(0);
      const queued = pendingEventsRef.current;
      pendingEventsRef.current = [];
      console.debug(`[co-browse] player ready (resize received), flushing ${queued.length} queued events`);
      for (const event of queued) replayer.addEvent(event);
    };
    replayer.on('resize', flush);

    // Re-fit whenever the agent resizes its own window.
    window.addEventListener('resize', fitToContainer);

    // Forward the agent's wheel gestures to the serviced user's DOM viewport.
    // Native non-passive listener so we can preventDefault (the container has
    // overflow-hidden; nothing else should scroll as a result of the wheel).
    const onWheel = (e: WheelEvent) => {
      const channel = channelRef.current;
      if (!isChannelReady(channel)) return;

      // Trackpad two-finger scroll on macOS sends ctrlKey:true with small
      // deltas — treat as scroll (not pinch) when there is meaningful delta.
      const isTruePinch = e.ctrlKey && Math.abs(e.deltaX) < 2 && Math.abs(e.deltaY) < 2;
      if (isTruePinch) return;

      e.preventDefault();
      const wrapper = containerRef.current?.querySelector('.replayer-wrapper') as HTMLElement | null;
      let scale = 1;
      const viewport = recordedViewportRef.current;
      if (wrapper && viewport?.width) {
        scale = wrapper.getBoundingClientRect().width / viewport.width || 1;
      }
      let deltaX = e.deltaX;
      let deltaY = e.deltaY;
      if (e.deltaMode === 1) {
        deltaX *= 16;
        deltaY *= 16;
      } else if (e.deltaMode === 2) {
        const h = containerRef.current?.clientHeight || window.innerHeight;
        deltaX *= h;
        deltaY *= h;
      }
      const point = getWrapperPoint(e);
      broadcastEvent(channel, 'agent-scroll', {
        deltaX: deltaX / scale,
        deltaY: deltaY / scale,
        x: point?.x,
        y: point?.y,
        smooth: false,
      });
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    // 'fullsnapshot-rebuilded' fires after the iframe's DOM tree has been
    // rebuilt from the first FullSnapshot — at this point the viewport is
    // visible to the agent, so we flip the UI state.
    const onFullSnapshotRebuilt = () => {
      setPlayerReady(true);
      console.log('[co-browse] full snapshot rebuilt — viewport visible');
    };
    replayer.on('fullsnapshot-rebuilded', onFullSnapshotRebuilt);

    return () => {
      replayer.off('resize', flush);
      replayer.off('fullsnapshot-rebuilded', onFullSnapshotRebuilt);
      window.removeEventListener('resize', fitToContainer);
      container.removeEventListener('wheel', onWheel);
      replayerRef.current = null;
      replayerReadyRef.current = false;
    };
  }, [sessionId, getWrapperPoint]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const channel = channelRef.current;
      if (!isChannelReady(channel)) return;
      const now = performance.now();
      if (now - cursorThrottleRef.current < 50) return;
      cursorThrottleRef.current = now;
      const point = getWrapperPoint(e);
      if (!point) return;
      broadcastEvent(channel, 'agent-cursor-move', {
        x: e.clientX,
        y: e.clientY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        percentX: point.x,
        percentY: point.y,
      });
    },
    [getWrapperPoint]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const channel = channelRef.current;
      if ((!pingMode && !controlMode) || !isChannelReady(channel)) return;

      const point = getWrapperPoint(e);
      if (!point) return;

      if (controlMode) {
        console.debug(`[co-browse] agent remote-click x=${point.x.toFixed(1)} y=${point.y.toFixed(1)}`);
        broadcastEvent(channel, 'agent-remote-click', { x: point.x, y: point.y });
      } else {
        broadcastEvent(channel, 'agent-ping-click', {
          x: point.x,
          y: point.y,
          label: 'Look Here!',
        });
      }
    },
    [pingMode, controlMode, getWrapperPoint]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const channel = channelRef.current;
      if (!controlMode || !isChannelReady(channel)) return;
      e.preventDefault();
      broadcastEvent(channel, 'agent-remote-keypress', {
        type: 'keydown',
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      });
    },
    [controlMode]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      const channel = channelRef.current;
      if (!controlMode || !isChannelReady(channel)) return;
      e.preventDefault();
      broadcastEvent(channel, 'agent-remote-keypress', {
        type: 'keyup',
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      });
    },
    [controlMode]
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
      const json = JSON.stringify(recordingRef.current);
      const compressed = pako.gzip(json);
      const fileName = `recordings/support_session_${sessionId}_${Date.now()}.json.gz`;
      const { error: uploadError } = await supabase.storage
        .from('support-sessions')
        .upload(fileName, new Blob([compressed], { type: 'application/octet-stream' }), {
          contentType: 'application/octet-stream',
        });
      if (uploadError) throw uploadError;

      // Private bucket: hand out a temporary signed URL for download.
      const { data: publicUrlData, error: signedUrlError } = await supabase.storage
        .from('support-sessions')
        .createSignedUrl(fileName, 3600);
      if (signedUrlError) throw signedUrlError;
      setUploadedUrl(publicUrlData.signedUrl);

      // Audit row: link the session to its recording.
      const { error: insertError } = await supabase.from('support_sessions').insert({
        session_id: sessionId,
        agent_user_id: userId,
        status: 'recorded',
        event_count: recordingRef.current.length,
        recording_path: fileName,
        started_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo la grabación.');
    } finally {
      setUploading(false);
    }
  }, [sessionId, userId]);

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
      <style>{`
        .replayer-wrapper,
        .replayer-wrapper iframe,
        .replayer-mouse,
        .replayer-mouse-tail { pointer-events: none !important; }
      `}</style>
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Co-Browsing en Vivo</h1>
            <p className="text-xs text-gray-500">
              Sesión: <code className="rounded bg-gray-200 px-1 py-0.5">{sessionId}</code>
            </p>
            {clientInfo && (
              <div className="mt-1.5 flex items-center gap-2">
                {clientInfo.imageUrl ? (
                  <img
                    src={clientInfo.imageUrl}
                    alt={clientInfo.name || 'Usuario'}
                    className="h-6 w-6 rounded-full object-cover ring-2 ring-teal-200"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                    {(clientInfo.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {clientInfo.name || 'Usuario atendido'}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {connected ? 'Conectado' : sessionEnded ? 'Sesión finalizada' : 'Desconectado'}
            </span>
            <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
              {eventCount} eventos
            </span>
            {!sessionEnded && firstEventType !== null && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  firstEventType === 2
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
                title="El primer evento debe ser un FullSnapshot (tipo 2) para que el reproductor pinte la pantalla."
              >
                <i className="fas fa-file-circle-check mr-1" />
                {firstEventType === 2 ? 'Snapshot inicial OK' : `Primer evento: tipo ${firstEventType}`}
              </span>
            )}
            {!sessionEnded && !playerReady && connected && (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                <i className="fas fa-spinner fa-spin mr-1" />
                Inicializando reproductor…
              </span>
            )}
            {!sessionEnded && (
              <>
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
                  onClick={() => setControlMode((m) => !m)}
                  title="El agente puede hacer clic y desplazarse dentro de la pantalla del usuario"
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    controlMode
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <i className={`fas fa-mouse-pointer mr-1.5 ${controlMode ? 'animate-pulse' : ''}`} />
                  {controlMode ? 'Control activo' : 'Modo Control'}
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
              </>
            )}
            <button
              type="button"
              onClick={() => router.push('/tech-support/co-browse')}
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
          tabIndex={0}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className={`relative h-[62vh] min-h-[400px] w-full overflow-hidden rounded-xl bg-white shadow ring-1 ring-gray-200 ${
            pingMode || controlMode ? 'cursor-crosshair' : 'cursor-none'
          }`}
        >
          {playerReady && <AgentCursorOverlay cursor={clientCursor} />}

          {sessionEnded && eventCount > 0 && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gray-900/70 backdrop-blur-sm">
              <div className="rounded-2xl bg-white p-8 shadow-2xl text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <i className="fas fa-check text-2xl text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Sesión finalizada</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {eventCount} eventos capturados · {Math.round((Date.now() - sessionStartTimeRef.current) / 60000)} min
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={exportRecording}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 transition"
                  >
                    <i className="fas fa-download" />
                    Exportar grabación (JSON)
                  </button>
                  <button
                    type="button"
                    onClick={uploadRecording}
                    disabled={uploading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition"
                  >
                    <i className={`fas fa-cloud-upload-alt ${uploading ? 'animate-spin' : ''}`} />
                    {uploading ? 'Subiendo...' : 'Subir a Supabase'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/tech-support/co-browse')}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gray-800 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900 transition"
                  >
                    <i className="fas fa-arrow-left" />
                    Salir
                  </button>
                </div>
                {uploadedUrl && (
                  <p className="mt-3 text-xs text-emerald-600">
                    <i className="fas fa-check-circle mr-1" />
                    Subida completa —{' '}
                    <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      ver archivo
                    </a>
                  </p>
                )}
                {error && (
                  <p className="mt-3 text-xs text-red-600">
                    <i className="fas fa-exclamation-triangle mr-1" />
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}

          {(!playerReady || eventCount === 0) && !sessionEnded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white text-gray-400">
              <i className="fas fa-video text-4xl" />
              <p className="mt-3 text-sm font-semibold">
                {!connected
                  ? 'Esperando conexión…'
                  : !playerReady
                    ? 'Inicializando reproductor…'
                    : 'Esperando datos de la sesión…'}
              </p>
              {!connected && (
                <p className="mt-1 text-xs">
                  El usuario debe iniciar «Compartir pantalla» desde su widget Soporte Remoto.
                </p>
              )}
            </div>
          )}
        </div>

        {controlMode && !sessionEnded && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
            <i className="fas fa-mouse-pointer" />
            <span>
              Control remoto activo: los clics en el visor se ejecutan en la pantalla del usuario. La
              rueda del ratón desplaza su vista. Desactívalo cuando termines.
            </span>
            <button
              type="button"
              onClick={() => setControlMode(false)}
              className="ml-auto shrink-0 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Desactivar
            </button>
          </div>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowDebug((s) => !s)}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
          >
            <i className={`fas fa-bug mr-1.5 ${showDebug ? 'text-teal-600' : ''}`} />
            Diagnóstico {showDebug ? 'ocultar' : 'mostrar'}
          </button>
          {showDebug && (
            <div className="mt-2 overflow-x-auto rounded-xl bg-gray-900 px-4 py-3 font-mono text-[11px] leading-relaxed text-gray-300">
              <p><span className="text-gray-500">channel:</span> cobrowse:{sessionId} ({channelState ?? '—'})</p>
              <p><span className="text-gray-500">conectado:</span> {connected ? 'sí' : 'no'} · <span className="text-gray-500">player listo:</span> {playerReady ? 'sí' : 'no'}</p>
              <p><span className="text-gray-500">eventos:</span> {eventCount} · <span className="text-gray-500">en cola:</span> {queuedCount}</p>
              <p>
                <span className="text-gray-500">primer evento:</span> {firstEventType ?? '—'}
                {firstEventType === 2 && <span className="text-emerald-400"> (FullSnapshot ✓)</span>}
                {firstEventType !== null && firstEventType !== 2 && <span className="text-amber-400"> (¡no es FullSnapshot!)</span>}
                {' '}· <span className="text-gray-500">último evento:</span> {lastEventType ?? '—'}
              </p>
              <p className="text-gray-500">Tipos de evento: 0=Meta · 2=FullSnapshot · 3=Incremental · 4=AdoptedStyle · 5=Viewport · 6=Font</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}