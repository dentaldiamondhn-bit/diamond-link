'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useCoBrowse } from '@/hooks/useCoBrowse';
import { RemoteCursorOverlay } from '@/components/support/RemoteCursorOverlay';

/**
 * Floating "Soporte Remoto" widget mounted in the authenticated layout.
 *
 * Idle: a small round button in the bottom-right corner.
 * Active: an expanded panel that shows the session code the staff member
 * copies/shares with the support agent (who opens
 * /tech-support/co-browse/<sessionId>), the live connection status, and a
 * stop control. While sharing, the agent's remote cursor + pings are drawn
 * on top of the whole page (renderAsOverlay).
 */
export function SupportWidget() {
  const { isSharing, sessionId, socket, startSupportSession, stopSupportSession } = useCoBrowse();

  const agentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tech-support/co-browse/${sessionId}`
    : '';

  if (!isSharing || !socket) {
    return (
      <button
        type="button"
        onClick={() => void startSupportSession()}
        className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-xl hover:from-indigo-700 hover:to-violet-700 transition-all print:hidden"
        title="Iniciar sesión de soporte remoto"
      >
        <i className="fas fa-headset" />
        Soporte Remoto
      </button>
    );
  }

  return (
    <>
      <RemoteCursorOverlay socket={socket} />
      <ActiveSupportPanel
        socket={socket}
        agentUrl={agentUrl}
        onStop={stopSupportSession}
      />
    </>
  );
}

function ActiveSupportPanel({
  socket,
  agentUrl,
  onStop,
}: {
  socket: Socket;
  agentUrl: string;
  onStop: () => void;
}) {
  const [connected, setConnected] = useState<boolean | null>(() => socket.connected);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  const copySession = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(agentUrl);
    } else {
      const input = document.createElement('input');
      input.value = agentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9990] w-80 rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 print:hidden">
      <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <i className={`fas fa-record-vinyl ${connected === false ? '' : 'animate-pulse'}`} />
          Sesión de soporte activa
        </div>
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          <i className="fas fa-phone-slash" />
          Terminar
        </button>
      </div>

      <div className="space-y-3 p-4">
        <p className="text-xs text-gray-600">
          Comparte este enlace con el agente de soporte para que vea tu pantalla en vivo:
        </p>

        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-gray-100 px-2 py-1.5 text-[11px] text-gray-700">
            {agentUrl}
          </code>
          <button
            type="button"
            onClick={copySession}
            className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-900"
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-1`} />
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
          <span className="text-gray-600">
            <i className="fas fa-satellite-dish mr-2 text-teal-600" />
            Relay
          </span>
          {connected === null ? (
            <span className="flex items-center gap-1 text-gray-500">
              <i className="fas fa-spinner fa-spin" /> Conectando…
            </span>
          ) : connected ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              En vivo
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Desconectado
            </span>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-gray-400">
          Los datos de pacientes se ocultan automáticamente (cumplimiento HIPAA).
        </p>
      </div>
    </div>
  );
}