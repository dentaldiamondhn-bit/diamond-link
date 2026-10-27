'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Maximize2, X } from 'lucide-react';
import type { PeerInfo } from '@/hooks/useCoBrowse';
import { AiChatPanel } from '@/components/support/AiChatPanel';

/**
 * Support panels that are only needed after a user interaction (opening the
 * support widget or starting a co-browse session). They live in their own
 * module so framer-motion and the panel markup are pulled in as a lazy chunk
 * instead of shipping with the authenticated layout shell.
 */

export function SupportPanel({
  open,
  tab,
  onTabChange,
  onClose,
  onStartSharing,
}: {
  open: boolean;
  tab: 'soporte' | 'chat';
  onTabChange: (tab: 'soporte' | 'chat') => void;
  onClose: () => void;
  onStartSharing: () => void;
}) {
  return (
    <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-6 right-6 z-[9990] w-80 sm:w-96 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 print:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <i className="fas fa-headset" />
                Soporte Remoto
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-white/90 transition-colors hover:text-white"
                aria-label="Close support panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => onTabChange('soporte')}
                className={`flex-1 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'soporte'
                    ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                }`}
              >
                <i className="fas fa-tower-cell mr-1.5" />
                Compartir pantalla
              </button>
              <button
                type="button"
                onClick={() => onTabChange('chat')}
                className={`flex-1 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'chat'
                    ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                }`}
              >
                <Bot size={16} className="mr-1 inline-block -mt-0.5" />
                Chat IA
              </button>
            </div>

            {tab === 'soporte' ? (
              <div className="space-y-3 p-4">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Comparte tu pantalla en vivo con un agente de soporte. Los datos de
                  pacientes se ocultan automáticamente (cumplimiento HIPAA).
                </p>
                <button
                  type="button"
                  onClick={onStartSharing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
                >
                  <i className="fas fa-tower-broadcast" />
                  Iniciar sesión en vivo
                </button>
              </div>
            ) : (
              <AiChatPanel />
            )}
          </motion.div>
        )}
      </AnimatePresence>
  );
}

/**
 * Compact floating indicator shown when the session is active and the agent
 * has connected. Replaces the full panel so it doesn't block the agent's
 * view of the serviced user's screen.
 */
export function MinimizedSessionIndicator({
  agentInfo,
  connected,
  onExpand,
  onStop,
}: {
  agentInfo: PeerInfo | null;
  connected: boolean;
  onExpand: () => void;
  onStop: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-xl ring-1 ring-gray-200 print:hidden"
    >
      {/* Agent avatar or initial */}
      {agentInfo?.imageUrl ? (
        <img
          src={agentInfo.imageUrl}
          alt={agentInfo.name || 'Agente'}
          className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-teal-200"
        />
      ) : (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
          {(agentInfo?.name || 'S').charAt(0).toUpperCase()}
        </div>
      )}

      {/* Status text */}
      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        {agentInfo?.name || 'Soporte'}
      </span>

      {/* Expand button */}
      <button
        type="button"
        onClick={onExpand}
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="Expandir panel de soporte"
      >
        <Maximize2 size={14} />
      </button>

      {/* Stop button */}
      <button
        type="button"
        onClick={onStop}
        className="flex h-6 w-6 items-center justify-center rounded-full text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
        title="Terminar sesión"
      >
        <i className="fas fa-phone-slash text-xs" />
      </button>
    </motion.div>
  );
}

export function ActiveSupportPanel({
  connected,
  agentUrl,
  agentInfo,
  onStop,
  onMinimize,
}: {
  connected: boolean;
  agentUrl: string;
  agentInfo: PeerInfo | null;
  onStop: () => void;
  onMinimize?: () => void;
}) {
  const [copied, setCopied] = useState(false);

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
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold text-white hover:bg-white/30"
              title="Minimizar panel"
            >
              <i className="fas fa-minus" />
            </button>
          )}
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            <i className="fas fa-phone-slash" />
            Terminar
          </button>
        </div>
      </div>

      {connected === false && (
        <div className="flex items-center gap-2 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
          <i className="fas fa-exclamation-triangle" />
          Relay desconectado — la sesión no está transmitiendo.
        </div>
      )}

      <div className="space-y-3 p-4">
        {agentInfo && (
          <div className="flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 ring-1 ring-teal-100">
            {agentInfo.imageUrl ? (
              <img
                src={agentInfo.imageUrl}
                alt={agentInfo.name || 'Agente'}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-teal-200"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                {(agentInfo.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-teal-900">
                {agentInfo.name || 'Agente de soporte'}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-teal-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Agente conectado — viendo tu pantalla
              </p>
            </div>
          </div>
        )}

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
