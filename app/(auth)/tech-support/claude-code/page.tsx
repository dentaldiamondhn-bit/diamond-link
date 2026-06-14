'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';
import { conversationService, type IConversation, type IMessage } from '@/services/conversation.service';
import { useAuth } from '@clerk/nextjs';
import OdysseusAuthModal from '@/components/OdysseusAuthModal';

interface OdysseusConfig {
  baseUrl: string;
  username: string;
  password: string;
  chatEndpoint?: string;
  workspace?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  model: string;
  userId: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  apiRoute: string;
  isFree: boolean;
  description: string;
  icon: string;
  color: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  is_public: boolean;
}

export default function ClaudeCodePage() {
  const { userRole } = useRoleBasedAccess();
  const { userId } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
const [input, setInput] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const [selectedModel, setSelectedModel] = useState<string>('groq-llama');
   const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);
   const [isLoadingSessions, setIsLoadingSessions] = useState(true);
   const [odysseusConfig, setOdysseusConfig] = useState<OdysseusConfig | null>(null);
   const [showOdysseusAuth, setShowOdysseusAuth] = useState(false);
   const [agentMode, setAgentMode] = useState(false);
   const [toolPolicies, setToolPolicies] = useState({
    allowBash: true,
    allowWebSearch: true,
    allowFileOps: true,
    allowCustomTools: true,
  });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
   const [agentRunStatus, setAgentRunStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
   const [agentRunHistory, setAgentRunHistory] = useState<Array<{
    id: string;
    timestamp: Date;
    status: 'completed' | 'error' | 'cancelled';
    message: string;
  }>>([]);
   const abortControllerRef = useRef<AbortController | null>(null);
   const messagesEndRef = useRef<HTMLDivElement>(null);

  // Available AI models (free and paid options)
  const availableModels: AIModel[] = [
    {
      id: 'groq-llama',
      name: 'Groq Llama 3.1',
      provider: 'Groq',
      apiRoute: '/api/groq-chat',
      isFree: true,
      description: 'Ultra fast responses',
      icon: '⚡',
      color: 'purple'
    },
    {
      id: 'odysseus',
      name: 'Odysseus AI',
      provider: 'Self-Hosted',
      apiRoute: '/api/odysseus-chat',
      isFree: true,
      description: 'Self-hosted workspace',
      icon: '🏛️',
      color: 'indigo'
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
    // Load odysseus config from localStorage on mount
    const storedConfig = localStorage.getItem('odysseus-config');
    if (storedConfig) {
      try {
        setOdysseusConfig(JSON.parse(storedConfig));
      } catch (error) {
        console.error('Failed to parse stored odysseus config:', error);
      }
    }
    
    checkApiConfiguration();
    loadSkills();
  }, [selectedModel]);

  const loadSkills = async () => {
    try {
      setIsLoadingSkills(true);
      const response = await fetch('/api/skills', {
        headers: { 'x-internal-call': 'true' }
      });
      const data = await response.json();
      setSkills(data.skills || []);
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const checkApiConfiguration = async () => {
    try {
      const currentModel = availableModels.find(m => m.id === selectedModel);
      if (!currentModel) return;

      const response = await fetch(currentModel.apiRoute, {
        method: 'GET'
      });

      const data = await response.json();
      setIsApiConfigured(data.configured);
      
      // If Odysseus is not configured, show the auth modal
      if (selectedModel === 'odysseus' && !data.configured) {
        setShowOdysseusAuth(true);
      }
    } catch (error) {
      console.error('API configuration check failed:', error);
      setIsApiConfigured(false);
      if (selectedModel === 'odysseus') {
        setShowOdysseusAuth(true);
      }
    }
  };

  const handleOdysseusAuthSave = async (config: OdysseusConfig) => {
    setOdysseusConfig(config);
    // Store in localStorage for persistence
    localStorage.setItem('odysseus-config', JSON.stringify(config));
    // Re-check configuration after saving
    await checkApiConfiguration();
  };

  const handleOdysseusAuthClose = () => {
    // Check if we already have config stored
    const stored = localStorage.getItem('odysseus-config');
    if (stored) {
      setOdysseusConfig(JSON.parse(stored));
    }
    setShowOdysseusAuth(false);
  };

  // Load conversations from database
  const loadConversations = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingSessions(true);
      const conversations = await conversationService.getConversations(userId);
      
      // Convert database format to ChatSession format
      const chatSessions: ChatSession[] = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: (conv.messages || []).map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          model: msg.model
        })),
        createdAt: conv.createdAt,
        model: conv.model,
        userId: conv.userId
      }));
      
      setSessions(chatSessions);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const createNewSession = async () => {
    if (!userId) return;
    
    try {
      const newConversation = await conversationService.createConversation(userId, {
        title: 'New Conversation',
        model: selectedModel
      });
      
      const newSession: ChatSession = {
        id: newConversation.id,
        title: newConversation.title,
        messages: [],
        createdAt: newConversation.createdAt,
        model: newConversation.model,
        userId: newConversation.userId
      };
      
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const selectSession = async (session: ChatSession) => {
    setCurrentSession(session);
  };

  const saveMessage = async (conversationId: string, message: Omit<IMessage, 'id' | 'conversationId' | 'createdAt'>) => {
    if (!userId) return;
    
    try {
      await conversationService.addMessage(conversationId, message);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isApiConfigured) return;
    
    if (selectedModel === 'odysseus' && !odysseusConfig) {
      setShowOdysseusAuth(true);
      return;
    }

    // Create new session if none exists
    let session = currentSession;
    if (!session) {
      await createNewSession();
      session = currentSession;
      if (!session) return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Add user message to UI immediately
    const updatedSession = { ...session, messages: [...session.messages, userMessage] };
    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
    
    // Save user message to database
    await saveMessage(session.id, {
      role: 'user',
      content: input.trim()
    });

    setInput('');
    setIsLoading(true);

    // Set agent run status if in agent mode
    const isAgentModel = selectedModel === 'odysseus' || selectedModel === 'groq-llama';
    if (isAgentModel && agentMode) {
      setAgentRunStatus('running');
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
    }

    try {
      const currentModel = availableModels.find(m => m.id === selectedModel);
      if (!currentModel) return;
      
      const response = await fetch(currentModel.apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: { currentPath: '/home/dentaldiamondhn/diamond-link' },
          odysseusConfig: selectedModel === 'odysseus' && odysseusConfig ? {
            baseUrl: odysseusConfig.baseUrl,
            username: odysseusConfig.username,
            password: odysseusConfig.password,
            chatEndpoint: odysseusConfig.chatEndpoint,
            workspace: odysseusConfig.workspace
          } : undefined,
          agentMode: isAgentModel ? agentMode : undefined,
          toolPolicies: isAgentModel && agentMode ? toolPolicies : undefined,
          customToolsEnabled: isAgentModel && agentMode && toolPolicies.allowCustomTools,
          skillId: isAgentModel ? selectedSkill : undefined
        }),
        signal: abortControllerRef.current?.signal
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details || data.error || 'Failed to get response';
        throw new Error(errorMsg);
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        model: selectedModel
      };

      // Add assistant message to UI
      const finalSession = { ...updatedSession, messages: [...updatedSession.messages, assistantMessage] };
      setCurrentSession(finalSession);
      setSessions(prev => prev.map(s => s.id === session.id ? finalSession : s));

      // Save assistant message to database
      await saveMessage(session.id, {
        role: 'assistant',
        content: data.message,
        model: selectedModel
      });

      // Update conversation title if it's the first exchange
      if (session.messages.length === 0) {
        const newTitle = input.trim().substring(0, 30) + (input.trim().length > 30 ? '...' : '');
        await conversationService.updateConversation(session.id, userId!, { title: newTitle });

        const titledSession = { ...finalSession, title: newTitle };
        setCurrentSession(titledSession);
        setSessions(prev => prev.map(s => s.id === session.id ? titledSession : s));
      }

      // Track successful agent run
      if (selectedModel === 'odysseus' && agentMode) {
        setAgentRunHistory(prev => [...prev, {
          id: `run-${Date.now()}`,
          timestamp: new Date(),
          status: 'completed',
          message: input
        }]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      if (selectedModel === 'odysseus' && agentMode) {
        // Check if it was an abort error
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Agent run cancelled by user');
          setAgentRunHistory(prev => [...prev, {
            id: `run-${Date.now()}`,
            timestamp: new Date(),
            status: 'cancelled',
            message: input
          }]);
        } else {
          setAgentRunStatus('error');
          setAgentRunHistory(prev => [...prev, {
            id: `run-${Date.now()}`,
            timestamp: new Date(),
            status: 'error',
            message: input
          }]);
        }
      }
    } finally {
      setIsLoading(false);
      if (selectedModel === 'odysseus' && agentMode) {
        setAgentRunStatus('idle');
        abortControllerRef.current = null;
      }
    }
  };

  const clearSession = async () => {
    if (currentSession && userId) {
      try {
        await conversationService.deleteConversation(currentSession.id, userId);
        setSessions(prev => prev.filter(s => s.id !== currentSession.id));
        setCurrentSession(null);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

// Load conversations on component mount
   useEffect(() => {
     if (userId) {
       loadConversations();
     }
   }, [userId]);

   // Load Odysseus config from localStorage on mount
   useEffect(() => {
     const stored = localStorage.getItem('odysseus-config');
     if (stored) {
       setOdysseusConfig(JSON.parse(stored));
     }
   }, []);

   // Check API configuration
   useEffect(() => {
     checkApiConfiguration();
   }, [selectedModel]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Modern Sidebar */}
      <div className="w-80 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chat Assistant</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Multi-Model Interface</p>
            </div>
          </div>
        </div>
        
        {/* Model Selector */}
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              AI Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    selectedModel === model.id
                      ? `border-${model.color} bg-${model.color}-50 dark:bg-${model.color}-900/20`
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                  }`}
                >
                  <span className="text-2xl mb-1">{model.icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{model.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    model.isFree ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {model.isFree ? 'Free' : 'Paid'}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {availableModels.find(m => m.id === selectedModel)?.description}
            </div>
          </div>

          {/* Agent Mode Toggle - For Odysseus and Groq */}
          {(selectedModel === 'odysseus' || selectedModel === 'groq-llama') && (
            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Agent Mode</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Enable tool execution</div>
                  </div>
                </div>
                <button
                  onClick={() => setAgentMode(!agentMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    agentMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      agentMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Tool Policy Controls - Only show when agent mode is enabled */}
              {agentMode && (
                <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Tool Permissions</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={toolPolicies.allowBash}
                        onChange={(e) => setToolPolicies(prev => ({ ...prev, allowBash: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Allow Bash Commands</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={toolPolicies.allowWebSearch}
                        onChange={(e) => setToolPolicies(prev => ({ ...prev, allowWebSearch: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Allow Web Search</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={toolPolicies.allowFileOps}
                        onChange={(e) => setToolPolicies(prev => ({ ...prev, allowFileOps: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Allow File Operations</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={toolPolicies.allowCustomTools}
                        onChange={(e) => setToolPolicies(prev => ({ ...prev, allowCustomTools: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Allow Diamond-Link Tools</span>
                    </label>
                  </div>

                  {/* Skill Selection */}
                  {(selectedModel === 'odysseus' || selectedModel === 'groq-llama') && (
                    <div className="mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Select Skill (Optional)</div>
                      <select
                        value={selectedSkill || ''}
                        onChange={(e) => setSelectedSkill(e.target.value || null)}
                        disabled={isLoadingSkills}
                        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">No skill selected</option>
                        {skills.map((skill) => (
                          <option key={skill.id} value={skill.id}>
                            {skill.name} ({skill.category})
                          </option>
                        ))}
                      </select>
                      {selectedSkill && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          {skills.find(s => s.id === selectedSkill)?.description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agent Run History */}
                  {agentRunHistory.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Agent Runs</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {agentRunHistory.slice(-5).reverse().map((run) => (
                          <div key={run.id} className="flex items-center gap-2 text-xs">
                            <div className={`w-2 h-2 rounded-full ${
                              run.status === 'completed' ? 'bg-green-500' :
                              run.status === 'error' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`}></div>
                            <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                              {run.message.substring(0, 30)}...
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                              {new Date(run.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">New Chat</span>
            </button>
          </div>
          
          {isLoadingSessions ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Select an AI model and start chatting with your coding assistant
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    currentSession?.id === session.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">{session.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {session.messages.length} messages • {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      availableModels.find(m => m.id === session.model)?.isFree
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {availableModels.find(m => m.id === session.model)?.name || 'Unknown'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* API Status */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              isApiConfigured === true ? 'bg-green-500' : 
              isApiConfigured === false ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {isApiConfigured === true ? 
                  `${availableModels.find(m => m.id === selectedModel)?.name} Connected` : 
                  'API Not Configured'
                }
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {availableModels.find(m => m.id === selectedModel)?.provider} • 
                {availableModels.find(m => m.id === selectedModel)?.description}
              </div>
            </div>
          </div>
{isApiConfigured === false && (
             <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
               <div className="flex items-center gap-2 mb-2">
                 <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h-1a2 2 0 00-2 2v10a2 2 0 002 2z" />
                 </svg>
                 <span className="text-sm font-medium text-red-700 dark:text-red-300">Configuration Required</span>
               </div>
               <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                 {selectedModel === 'groq-llama' ? 'Add GROQ_API_KEY to .env' :
                  selectedModel === 'odysseus' ? 'Odysseus requires authentication. Configure API credentials below.' :
                  'Configure API key'}
               </p>
               {selectedModel === 'odysseus' && (
                 <button
                   onClick={() => setShowOdysseusAuth(true)}
                   className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                 >
                   Configure Odysseus
                 </button>
               )}
             </div>
           )}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
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
                  {selectedModel === 'odysseus' && agentMode && (
                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs">
                      Agent Mode
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {selectedModel === 'odysseus' && agentMode && agentRunStatus === 'running' && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Agent Running</span>
                    </div>
                    <button
                      onClick={() => {
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort();
                          setAgentRunStatus('idle');
                        }
                      }}
                      className="text-xs px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      title="Cancel Agent Run"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {selectedModel === 'odysseus' && odysseusConfig && (
                  <button
                    onClick={() => setShowOdysseusAuth(true)}
                    className="text-xs px-2 py-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                    title="Reconfigure Odysseus"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.546 2.626-1.546 3.05 0l.25 1.068a2.996 2.996 0 013.49.698l.95 1.292c1.532.954 2.016 2.847.75 4.22a.99.99 0 01-.75.427H9.5a.99.99 0 01-.75-.427l-.95-1.292a2.996 2.996 0 01.75-4.22l.25-1.068z" />
                    </svg>
                  </button>
                )}
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
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isApiConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {availableModels.find(m => m.id === selectedModel)?.name}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        availableModels.find(m => m.id === selectedModel)?.isFree
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {availableModels.find(m => m.id === selectedModel)?.icon || '🤖'} {availableModels.find(m => m.id === selectedModel)?.name || 'AI'}
                      </div>
                    </div>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isApiConfigured ? "Escribe tu mensaje aquí..." : "Configura la API para comenzar"}
                      disabled={!isApiConfigured || isLoading}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Enter</span> para enviar • <span className="font-medium">Shift + Enter</span> para nueva línea
                      </p>
                      <div className="text-xs text-gray-400">
                        {input.length}/2000 caracteres
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading || !isApiConfigured}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No session selected */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="text-center max-w-2xl">
              {/* Model Selection for Empty State */}
              <div className="mb-8">
                <label className="block text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Selecciona Modelo AI:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {availableModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 ${
                        selectedModel === model.id
                          ? `border-${model.color} bg-${model.color}-50 dark:bg-${model.color}-900/20 shadow-lg`
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <span className="text-3xl mb-2">{model.icon}</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{model.name}</span>
                      <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                        model.isFree ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {model.isFree ? '✅ Free' : '💳 Paid'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {availableModels.find(m => m.id === selectedModel)?.description}
                </p>
              </div>
              
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <span className="text-5xl text-white font-bold">AI</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {availableModels.find(m => m.id === selectedModel)?.name} Assistant
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                Asistente de IA avanzado para desarrollo de software
                <br />
                <span className="font-semibold text-gray-900 dark:text-white">Escribe código, depura errores, explica conceptos</span>
              </p>
              <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto mb-8">
                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700">
                  <span className="text-blue-700 dark:text-blue-300 font-bold">💻 Desarrollo</span>
                </div>
                <div className="px-6 py-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-700">
                  <span className="text-green-700 dark:text-green-300 font-bold">🐛 Depuración</span>
                </div>
                <div className="px-6 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-700">
                  <span className="text-purple-700 dark:text-purple-300 font-bold">📚 Aprendizaje</span>
                </div>
              </div>
<button
                onClick={createNewSession}
                disabled={!isApiConfigured}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-xl text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
              >
                {!isApiConfigured ? '🔧 API No Configurada' : '🚀 Iniciar Conversación'}
              </button>
              {!isApiConfigured && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-700 max-w-2xl mx-auto">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h-1a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-lg font-bold text-red-700 dark:text-red-300">Configuración Requerida</span>
                  </div>
                  <p className="text-red-600 dark:text-red-400 mb-3">
                    {selectedModel === 'groq-llama' ? 'Añade GROQ_API_KEY a tu archivo .env' :
                     selectedModel === 'odysseus' ? 'Odysseus requiere autenticación. Configura las credenciales API.' :
                     'Configura la API key'}
                  </p>
                  {selectedModel === 'odysseus' && (
                    <button
                      onClick={() => setShowOdysseusAuth(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Configurar Odysseus
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Odysseus Auth Modal */}
        <OdysseusAuthModal
          isOpen={showOdysseusAuth}
          onClose={handleOdysseusAuthClose}
          onSave={handleOdysseusAuthSave}
        />
      </div>
    </div>
  );
}
