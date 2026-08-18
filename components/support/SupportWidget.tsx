'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, User, MessageCircle, Maximize2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useUserRole } from '@/hooks/useUserRole';
import { useCoBrowse, type PeerInfo } from '@/hooks/useCoBrowse';
import { RemoteCursorOverlay } from '@/components/support/RemoteCursorOverlay';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

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
 */
export function SupportWidget() {
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
  const wasSharingRef = useRef(false);

  const agentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tech-support/co-browse/${sessionId}`
    : '';

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
      </>
    );
  }

  return (
    <>
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
                onClick={() => setOpen(false)}
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
                onClick={() => setTab('soporte')}
                className={`flex-1 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'soporte'
                    ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <i className="fas fa-tower-cell mr-1.5" />
                Compartir pantalla
              </button>
              <button
                type="button"
                onClick={() => setTab('chat')}
                className={`flex-1 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'chat'
                    ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
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
                  onClick={() => void startSupportSession()}
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

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all hover:from-indigo-700 hover:to-violet-700 print:hidden"
          title="Soporte remoto y asistente de IA"
        >
          <MessageCircle size={18} />
          Soporte Remoto
        </button>
      )}
    </>
  );
}

/**
 * Compact floating indicator shown when the session is active and the agent
 * has connected. Replaces the full panel so it doesn't block the agent's
 * view of the serviced user's screen.
 */
function MinimizedSessionIndicator({
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

function ActiveSupportPanel({
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

const AGENT_ROLES = ['tech_support', 'admin', 'doctor', 'staff'];

/**
 * Diamond Assistant chat — previously GlobalChatBubble. Lives behind the
 * "Chat IA" tab of the support widget.
 */
function AiChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const [skills, setSkills] = useState<Array<{ id: string; name: string; category: string; metadata?: any }>>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { userRole, userId, isLoaded } = useUserRole();
  const { user } = useUser();

  useEffect(() => {
    if (AGENT_ROLES.includes(userRole || '')) {
      const fetchSkills = async () => {
        try {
          const res = await fetch('/api/skills');
          const data = await res.json();
          const allSkills = data.skills || [];
          let filteredSkills = allSkills;
          if (userRole === 'staff') {
            filteredSkills = allSkills.filter((skill: { category?: string; name?: string; description?: string }) =>
              skill.category === 'code' ||
              skill.category === 'app' ||
              (skill.name || '').toLowerCase().includes('code') ||
              (skill.name || '').toLowerCase().includes('app') ||
              (skill.description || '').toLowerCase().includes('code') ||
              (skill.description || '').toLowerCase().includes('app')
            );
          }
          setSkills(filteredSkills);
        } catch (e) {
          console.error('Failed to fetch skills', e);
        }
      };
      void fetchSkills();
    }
  }, [userRole]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/groq-chat?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load chat history');
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
        setConversationId(data.conversationId || null);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void loadHistory();
    }
  }, [userId, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isLoaded) return null;

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/groq-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          userRole: userRole || 'guest',
          userId,
          conversationId,
          agentMode: AGENT_ROLES.includes(userRole || '') ? agentMode : false,
          skillId: AGENT_ROLES.includes(userRole || '') ? selectedSkill : undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();
      if (data.conversationId) setConversationId(data.conversationId);
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[420px] flex-col bg-gray-50 dark:bg-gray-900/50">
      {/* Assistant header */}
      <div className="flex items-center justify-between bg-teal-500 dark:bg-teal-600 px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <div>
            <h3 className="font-semibold text-sm leading-tight">Diamond Assistant</h3>
            <p className="text-[11px] text-teal-100 capitalize">
              {userRole ? `${userRole.replace('_', ' ')} Mode` : 'Guest Mode'}
            </p>
          </div>
        </div>
      </div>

      {AGENT_ROLES.includes(userRole || '') && (
        <div className="border-b border-gray-200 bg-gray-100 p-3 text-sm dark:border-gray-600 dark:bg-gray-700/50">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Agent Mode</span>
            <button
              type="button"
              onClick={() => setAgentMode(!agentMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                agentMode ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                agentMode ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {agentMode && skills.length > 0 && (
            <div>
              <select
                value={selectedSkill || ''}
                onChange={(e) => setSelectedSkill(e.target.value || null)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">No skill selected</option>
                {(() => {
                  const grouped = skills.reduce((acc, skill) => {
                    const division = skill.metadata?.division || skill.category || 'Other';
                    if (!acc[division]) acc[division] = [];
                    acc[division].push(skill);
                    return acc;
                  }, {} as Record<string, typeof skills>);
                  return Object.entries(grouped).map(([division, divisionSkills]) => (
                    <optgroup key={division} label={division.charAt(0).toUpperCase() + division.slice(1).replace('-', ' ')}>
                      {divisionSkills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.metadata?.emoji ? `${String(s.metadata.emoji)} ` : ''}
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>
              {userRole === 'staff' && (
                <div className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
                  * Limited skills for {userRole.replace('_', ' ')} role
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center text-gray-500 dark:text-gray-400">
            <Bot size={48} className="mb-4 text-teal-200 dark:text-teal-800" />
            <p className="text-sm">Hello! I'm your AI assistant. How can I help you today?</p>
          </div>
        ) : (
          [...messages]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .filter((m) => m.role !== 'system')
            .map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'user' && user?.imageUrl ? (
                    <img src={user.imageUrl} alt="User avatar" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === 'user'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                  )}
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl p-3 text-sm ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-blue-500 text-white'
                        : 'rounded-tl-sm border border-gray-100 bg-white text-gray-800 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <Bot size={16} />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}