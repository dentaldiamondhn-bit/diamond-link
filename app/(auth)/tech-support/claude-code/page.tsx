'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useRef, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  model?: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  apiRoute: string;
  isFree: boolean;
  description: string;
}

export default function ClaudeCodePage() {
  const { userRole } = useRoleBasedAccess();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-pro');
  const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Available AI models (free and paid options)
  const availableModels: AIModel[] = [
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'Google',
      apiRoute: '/api/gemini-chat',
      isFree: true,
      description: 'Free tier: 1,500 requests/day'
    },
    {
      id: 'claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'Anthropic',
      apiRoute: '/api/claude-cli',
      isFree: false,
      description: 'Paid API key required'
    },
    {
      id: 'local-llama',
      name: 'Local Llama',
      provider: 'Ollama',
      apiRoute: '/api/local-ai',
      isFree: true,
      description: 'Local models - completely free'
    },
    {
      id: 'groq-llama',
      name: 'Groq Llama',
      provider: 'Groq',
      apiRoute: '/api/groq-chat',
      isFree: true,
      description: 'Free tier: 30 requests/minute'
    }
  ];

  // Check if user is tech support
  if (userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permiso para acceder a esta página."
        explanation="Esta área es exclusiva para el personal de soporte técnico."
        contactInfo="Si necesitas acceso, contacta a un administrador del sistema."
        onGoBack={() => window.history.back()}
      />
    );
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Check API configuration on mount
  useEffect(() => {
    checkApiConfiguration();
  }, [selectedModel]);

  const checkApiConfiguration = async () => {
    try {
      const currentModel = availableModels.find(m => m.id === selectedModel);
      if (!currentModel) return;
      
      const response = await fetch(currentModel.apiRoute, {
        method: 'GET'
      });
      
      const data = await response.json();
      setIsApiConfigured(data.configured);
    } catch {
      setIsApiConfigured(false);
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Nueva conversación',
      messages: [],
      createdAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isApiConfigured) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const newMessages = currentSession 
      ? [...currentSession.messages, userMessage]
      : [userMessage];

    // Create new session if none exists
    let session = currentSession;
    if (!session) {
      session = {
        id: `session-${Date.now()}`,
        title: input.trim().substring(0, 30) + (input.trim().length > 30 ? '...' : ''),
        messages: newMessages,
        createdAt: new Date()
      };
      setSessions(prev => [session!, ...prev]);
    } else {
      // Update existing session
      session = { ...session, messages: newMessages };
      setSessions(prev => prev.map(s => s.id === session.id ? session : s));
    }
    
    setCurrentSession(session);
    setInput('');
    setIsLoading(true);

    try {
      const currentModel = availableModels.find(m => m.id === selectedModel);
      if (!currentModel) return;
      
      const response = await fetch(currentModel.apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: { currentPath: '/home/dentaldiamondhn/diamond-link' }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      const updatedMessages = [...newMessages, assistantMessage];
      const updatedSession = { ...session, messages: updatedMessages };
      
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === session!.id ? updatedSession : s));

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${(error as Error).message}`,
        timestamp: new Date()
      };
      const updatedMessages = [...newMessages, errorMessage];
      const updatedSession = { ...session, messages: updatedMessages };
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === session!.id ? updatedSession : s));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearSession = () => {
    if (currentSession) {
      setSessions(prev => prev.filter(s => s.id !== currentSession.id));
      setCurrentSession(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Sessions List */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Conversación
          </button>
          
          {/* Model Selector */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Modelo AI:
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.isFree ? 'Gratis' : 'Pago'})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {availableModels.find(m => m.id === selectedModel)?.description}
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
              No hay conversaciones aún
            </p>
          ) : (
            sessions.map(session => (
              <button
                key={session.id}
                onClick={() => selectSession(session)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-medium text-sm truncate">{session.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {session.messages.length} mensajes
                </div>
              </button>
            ))
          )}
        </div>

        {/* API Status */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              isApiConfigured === true ? 'bg-green-500' : 
              isApiConfigured === false ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-gray-600 dark:text-gray-400">
              {isApiConfigured === true ? `${availableModels.find(m => m.id === selectedModel)?.name} Listo` : 
               isApiConfigured === false ? 'API No Disponible' : 'Verificando...'}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Modelo actual: {availableModels.find(m => m.id === selectedModel)?.name}
            {availableModels.find(m => m.id === selectedModel)?.isFree && ' ✅ Gratis'}
          </div>
          {isApiConfigured === false && (
            <p className="text-xs text-red-500 mt-2">
              {selectedModel === 'claude-sonnet-4' ? 'Configura ANTHROPIC_API_KEY en .env' :
               selectedModel === 'local-llama' ? 'Instala Ollama: curl -fsSL https://ollama.com/install.sh | sh' :
               selectedModel === 'groq-llama' ? 'Configura GROQ_API_KEY en .env' :
               'Configura GEMINI_API_KEY en .env'}
            </p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {availableModels.find(m => m.id === selectedModel)?.name} Assistant
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentSession.messages.length} mensajes
                </p>
              </div>
              <button
                onClick={clearSession}
                className="text-gray-500 hover:text-red-500 transition-colors"
                title="Eliminar conversación"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentSession.messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    ¡Hola! Soy tu asistente de código
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Puedo ayudarte a escribir código, depurar errores, explicar conceptos y más.
                    Escribe tu pregunta abajo para comenzar.
                  </p>
                </div>
              )}

              {currentSession.messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-blue-700' 
                          : 'bg-purple-100 dark:bg-purple-900/30'
                      }`}>
                        {message.role === 'user' ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isApiConfigured ? "Escribe tu mensaje..." : "API no configurada"}
                    disabled={!isApiConfigured || isLoading}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading || !isApiConfigured}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Presiona Enter para enviar, Shift+Enter para nueva línea
              </p>
            </div>
          </>
        ) : (
          /* No session selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl">
              {/* Model Selection for Empty State */}
              <div className="mb-6">
                <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Selecciona Modelo AI:
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg mb-3"
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.isFree ? 'Gratis' : 'Pago'})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {availableModels.find(m => m.id === selectedModel)?.description}
                </p>
              </div>
              
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {availableModels.find(m => m.id === selectedModel)?.name} Assistant
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                Asistente de IA para ayudarte con código, depuración y desarrollo
              </p>
              <button
                onClick={createNewSession}
                disabled={!isApiConfigured}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isApiConfigured ? 'API No Configurada' : 'Iniciar Conversación'}
              </button>
              {!isApiConfigured && (
                <p className="text-sm text-red-500 mt-2">
                  {selectedModel === 'claude-sonnet-4' ? 'Configura ANTHROPIC_API_KEY en .env' :
                   selectedModel === 'local-llama' ? 'Instala Ollama: curl -fsSL https://ollama.com/install.sh | sh' :
                   selectedModel === 'groq-llama' ? 'Configura GROQ_API_KEY en .env' :
                   'Configura GEMINI_API_KEY en .env'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
