'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageCircle } from 'lucide-react';
import { useCoBrowse, type PeerInfo } from '@/hooks/useCoBrowse';
import { RemoteCursorOverlay } from '@/components/support/RemoteCursorOverlay';

/**
 * Floating support widget mounted in the authenticated layout.
 *
 * The button opens a panel with two tabs:
 *  - Chat IA: the former GlobalChatBubble (Diamond Assistant with Agent
 *    Mode + skills) — moved here so every help channel lives behind one
 *    floating button.
 *  - Soporte: start the co-browsing session; while a session is active the
 *    widget shows the session panel (agent URL, relay status, stop) and the
 *    agent's remote cursor/pings are drawn over the page.
 *
 * Only the trigger lives in the authenticated shell. The panels (and with them
 * framer-motion) are loaded as a lazy chunk the first time the user opens the
 * widget or joins a support session; rrweb is only fetched when a co-browse
 * session actually starts (see hooks/useCoBrowse).
 */

const SupportPanel = dynamic(
  () => import('@/components/support/SupportPanels').then((m) => m.SupportPanel),
  { ssr: false }
);
const ActiveSupportPanel = dynamic(
  () => import('@/components/support/SupportPanels').then((m) => m.ActiveSupportPanel),
  { ssr: false }
);
const MinimizedSessionIndicator = dynamic(
  () => import('@/components/support/SupportPanels').then((m) => m.MinimizedSessionIndicator),
  { ssr: false }
);

export function SupportWidget({ variant = 'floating' }: { variant?: 'floating' | 'header' } = {}) {
  const {
    isSharing,
    sessionId,
    channel,
    channelConnected,
    agentInfo,
    remoteCursor,
    pings,
    startSupportSession,
    stopSupportSession,
  } = useCoBrowse();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'soporte' | 'chat'>('soporte');
  const [minimized, setMinimized] = useState(false);
  // Keeps the lazy panel chunk mounted after the first interaction so the
  // open/close animations keep working and later opens are instant.
  const [panelMounted, setPanelMounted] = useState(false);
  const wasSharingRef = useRef(false);

  const agentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tech-support/co-browse/${sessionId}`
    : '';

  const openPanel = () => {
    setPanelMounted(true);
    setOpen((v) => !v);
  };

  // Header variant trigger: matched to the other header icon buttons (search,
  // dark mode, bell). The panel and session overlays stay floating overlays.
  const headerTrigger = (
    <button
      type="button"
      onClick={openPanel}
      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors print:hidden"
      title="Soporte remoto y asistente de IA"
    >
      <MessageCircle size={20} />
    </button>
  );

  // Auto-minimize when agent connects during an active session.
  // When the session starts, the full panel is visible so the user can copy
  // the session URL. Once the agent joins (agentInfo becomes non-null) we
  // collapse it to a small indicator so it doesn't block the agent's view.
  // Reset minimized when session ends.
  useEffect(() => {
    if (!isSharing) {
      wasSharingRef.current = false;
      // Defer to avoid synchronous setState inside the effect body.
      const id = setTimeout(() => setMinimized(false), 0);
      return () => clearTimeout(id);
    } else if (agentInfo && !wasSharingRef.current) {
      wasSharingRef.current = true;
      const id = setTimeout(() => setMinimized(true), 0);
      return () => clearTimeout(id);
    }
  }, [isSharing, agentInfo]);

  if (isSharing && channel) {
    return (
      <>
        <RemoteCursorOverlay remoteCursor={remoteCursor} pings={pings} />
        {minimized ? (
          <MinimizedSessionIndicator
            agentInfo={agentInfo}
            connected={channelConnected}
            onExpand={() => setMinimized(false)}
            onStop={stopSupportSession}
          />
        ) : (
          <ActiveSupportPanel
            connected={channelConnected}
            agentUrl={agentUrl}
            agentInfo={agentInfo}
            onStop={stopSupportSession}
            onMinimize={() => setMinimized(true)}
          />
        )}
        {variant === 'header' && headerTrigger}
      </>
    );
  }

  return (
    <>
      {panelMounted && (
        <SupportPanel
          open={open}
          tab={tab}
          onTabChange={setTab}
          onClose={() => setOpen(false)}
          onStartSharing={() => void startSupportSession()}
        />
      )}

      {variant === 'header' ? (
        headerTrigger
      ) : (
        !open && (
          <button
            type="button"
            onClick={openPanel}
            className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all hover:from-indigo-700 hover:to-violet-700 print:hidden"
            title="Soporte remoto y asistente de IA"
          >
            <MessageCircle size={18} />
            Soporte Remoto
          </button>
        )
      )}
    </>
  );
}

export type { PeerInfo };
