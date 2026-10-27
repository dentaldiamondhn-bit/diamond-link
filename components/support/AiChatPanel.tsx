'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, User } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useUserRole } from '@/hooks/useUserRole';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const AGENT_ROLES = ['tech_support', 'admin', 'doctor', 'staff'];

/**
 * Diamond Assistant chat — previously GlobalChatBubble. Lives behind the
 * "Chat IA" tab of the support widget. Loaded lazily with the rest of the
 * support panels so its code never lands in the authenticated shell bundle.
 */
export function AiChatPanel() {
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
