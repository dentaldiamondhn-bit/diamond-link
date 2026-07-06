'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { UserButton, useUser } from '@clerk/nextjs';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export default function GlobalChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState(false);
  const [skills, setSkills] = useState<Array<{id: string, name: string, category: string, metadata?: any}>>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { userRole, userId, isLoaded } = useUserRole();
  const { user } = useUser();

  useEffect(() => {
    if (['tech_support', 'admin', 'doctor', 'staff'].includes(userRole || '')) {
      const fetchSkills = async () => {
        try {
          const res = await fetch('/api/skills');
          const data = await res.json();
          const allSkills = data.skills || [];
          
          // Filter skills based on user role
          let filteredSkills = allSkills;
          if (userRole !== 'tech_support') {
            // For admin/doctor/staff: only show code-related or app-related skills
            filteredSkills = allSkills.filter(skill => 
              skill.category === 'code' || 
              skill.category === 'app' ||
              skill.name.toLowerCase().includes('code') ||
              skill.name.toLowerCase().includes('app') ||
              skill.description?.toLowerCase().includes('code') ||
              skill.description?.toLowerCase().includes('app')
            );
          }
          
          setSkills(filteredSkills);
        } catch (e) {
          console.error('Failed to fetch skills', e);
        }
      };
      fetchSkills();
    }
  }, [userRole]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/groq-chat?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load chat history');
      }
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
        setConversationId(data.conversationId || null);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }, [userId]);

  // Load chat history when opened
  useEffect(() => {
    if (userId && isOpen) {
      loadHistory();
    }
  }, [userId, isOpen, loadHistory]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // If user auth isn't loaded yet, don't render the chat bubble
  if (!isLoaded) return null;

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input.trim(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/groq-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          userRole: userRole || 'guest',
          userId: userId,
          conversationId: conversationId,
          agentMode: ['tech_support', 'admin', 'doctor', 'staff'].includes(userRole || '') ? agentMode : false,
          skillId: ['tech_support', 'admin', 'doctor', 'staff'].includes(userRole || '') ? selectedSkill : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.', timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed z-50 flex flex-col items-end ${isOpen ? 'bottom-0 right-4 sm:right-10' : 'bottom-6 right-6'}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: 'bottom right' }}
            className="w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-2xl shadow-[0_-5px_25px_-5px_rgba(0,0,0,0.1)] border-t border-l border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-teal-500 dark:bg-teal-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Bot size={24} />
                <div>
                  <h3 className="font-semibold text-lg leading-tight">Diamond Assistant</h3>
                  <p className="text-xs text-teal-100 opacity-90 capitalize">
                    {userRole ? `${userRole.replace('_', ' ')} Mode` : 'Guest Mode'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Clerk User Avatar */}
                <div className="relative flex-shrink-0">
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 shadow-md",
                        userButton: "hover:bg-teal-600 rounded-lg transition-colors"
                      }
                    }}
                  />
                </div>
                <button 
                  onClick={toggleChat}
                  className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded-full transition-colors"
                  aria-label="Close chat"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {(['tech_support', 'admin', 'doctor', 'staff'].includes(userRole || '')) && (
              <div className="bg-gray-100 dark:bg-gray-700/50 p-3 border-b border-gray-200 dark:border-gray-600 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Agent Mode</span>
                  <button
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
                  <div className="mt-2">
                    <select
                      value={selectedSkill || ''}
                      onChange={(e) => setSelectedSkill(e.target.value || null)}
                      className="w-full text-xs border border-gray-300 dark:border-gray-500 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    >
                      <option value="">No skill selected</option>
                      {(() => {
                        // Group skills by division
                        const grouped = skills.reduce((acc, skill) => {
                          const division = skill.metadata?.division || skill.category || 'Other';
                          if (!acc[division]) acc[division] = [];
                          acc[division].push(skill);
                          return acc;
                        }, {} as Record<string, typeof skills>);
                        
                        return Object.entries(grouped).map(([division, divisionSkills]) => (
                          <optgroup key={division} label={division.charAt(0).toUpperCase() + division.slice(1).replace('-', ' ')}>
                            {divisionSkills.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.metadata?.emoji ? `${s.metadata.emoji} ` : ''}{s.name}
                              </option>
                            ))}
                          </optgroup>
                        ));
                      })()}
                    </select>
                    {userRole !== 'tech_support' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                        * Limited skills for {userRole?.replace('_', ' ')} role
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-4">
                  <Bot size={48} className="mb-4 text-teal-200 dark:text-teal-800" />
                  <p className="text-sm">
                    Hello! I'm your AI assistant. How can I help you today?
                  </p>
                </div>
              ) : (
                [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .filter(m => m.role !== 'system').map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.role === 'user' && user?.imageUrl ? (
                        <img 
                          src={user.imageUrl} 
                          alt="User avatar"
                          className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'user' 
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                        }`}>
                          {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                      )}
                      <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <Bot size={16} />
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-1">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <form onSubmit={sendMessage} className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 max-h-32 min-h-[44px] resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:text-white"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 h-[44px] w-[44px] bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={toggleChat}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 bg-teal-500 hover:bg-teal-600 text-white rounded-full shadow-xl flex items-center justify-center transition-colors relative"
            aria-label="Open chat assistant"
          >
            <MessageCircle size={28} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}