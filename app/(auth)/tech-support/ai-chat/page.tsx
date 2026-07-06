'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';
import { conversationService } from '@/services/conversation.service';
import { useAuth, useUser, UserButton } from '@clerk/nextjs';
import { Menu, Plus, Send, Bot, User, Loader2, MessageSquare, Settings, Zap, Brain, Code2, Sparkles, ChevronDown } from 'lucide-react';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import Link from 'next/link';

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
}

export default function AIChatPage() {
  const { userRole } = useRoleBasedAccess();
  const { userId } = useAuth();
  const { user } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('groq-llama');
  const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agentMode, setAgentMode] = useState(false);
  const [skills, setSkills] = useState<Array<{id: string, name: string, description: string, category: string, metadata?: any}>>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const availableModels: AIModel[] = [
    {
      id: 'groq-llama',
      name: 'Groq Llama 3.1',
      provider: 'Groq',
      apiRoute: '/api/groq-chat',
      isFree: true,
      description: 'Ultra fast responses',
      icon: '⚡'
    },
    {
      id: 'odysseus',
      name: 'Odysseus AI',
      provider: 'Self-Hosted',
      apiRoute: '/api/odysseus-chat',
      isFree: true,
      description: 'Self-hosted workspace',
      icon: '🏛️'
    }
  ];

  const allowedRoles = ['tech_support', 'admin', 'doctor', 'staff'];
  if (!allowedRoles.includes(userRole)) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to access this page."
        explanation="This area is exclusive for authorized personnel."
        contactInfo="If you need access, contact an administrator."
        onGoBack={() => window.history.back()}
      />
    );
  }

  const hasLimitedAccess = ['admin', 'doctor', 'staff'].includes(userRole);

  // Role badge colors and styles
  const getRoleBadgeInfo = (role: string) => {
    switch (role) {
      case 'tech_support':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: 'fas fa-tools',
          label: 'Tech Support'
        };
      case 'admin':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          icon: 'fas fa-crown',
          label: 'Administrador'
        };
      case 'doctor':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: 'fas fa-user-md',
          label: 'Doctor'
        };
      case 'staff':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: 'fas fa-user',
          label: 'Staff'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: 'fas fa-question',
          label: 'Desconocido'
        };
    }
  };

  const roleBadgeInfo = getRoleBadgeInfo(userRole || 'staff');

  // Navigation items based on role
  const getNavItems = () => {
    switch (userRole) {
      case 'tech_support':
        return [
          { href: '/tech-support/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
          { href: '/tech-support/tickets', label: 'Tickets de Soporte', icon: 'fas fa-ticket-alt' },
          { href: '/tech-support/system-logs', label: 'Logs del Sistema', icon: 'fas fa-file-alt' },
          { href: '/tech-support/system-settings', label: 'Configuración del Sistema', icon: 'fas fa-cogs' },
          { href: '/tech-support/terminal', label: 'Terminal', icon: 'fas fa-terminal' },
          { href: '/tech-support/code-runner', label: 'Code Runner', icon: 'fas fa-code' },
          { href: '/tech-support/access-portal', label: 'Portal de Acceso', icon: 'fas fa-th-large' },
          { href: '/tech-support/users', label: 'Usuarios', icon: 'fas fa-users-cog' },
        ];
      case 'admin':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
          { href: '/patient-form', label: 'Nueva Historia Clínica', icon: 'fas fa-file-medical' },
          { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-users' },
          { href: '/doctores', label: 'Doctores', icon: 'fas fa-user-md' },
          { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
          { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
          { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
          { href: '/reports', label: 'Reportes', icon: 'fas fa-chart-bar' },
          { href: '/tickets', label: 'Tickets', icon: 'fas fa-ticket-alt' },
        ];
      case 'doctor':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
          { href: '/patient-form', label: 'Nueva Historia Clínica', icon: 'fas fa-file-medical' },
          { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-users' },
          { href: '/tratamientos', label: 'Tratamientos', icon: 'fas fa-tooth' },
          { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
          { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
          { href: '/reports', label: 'Reportes', icon: 'fas fa-chart-bar' },
          { href: '/tickets', label: 'Tickets', icon: 'fas fa-ticket-alt' },
        ];
      case 'staff':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
          { href: '/patient-form', label: 'Nueva Historia Clínica', icon: 'fas fa-file-medical' },
          { href: '/pacientes', label: 'Pacientes', icon: 'fas fa-users' },
          { href: '/calendario', label: 'Calendario', icon: 'fas fa-calendar' },
          { href: '/consentimientos', label: 'Consentimientos', icon: 'fas fa-file-contract' },
          { href: '/tickets', label: 'Tickets', icon: 'fas fa-ticket-alt' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const formatTime = (date: Date | string | undefined) => {
    if (!date) return '';
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (userId) {
      loadConversations();
      checkApiConfiguration();
      loadSkills();
    }
  }, [userId]);

  useEffect(() => {
    checkApiConfiguration();
  }, [selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const loadSkills = async () => {
    try {
      const response = await fetch('/api/skills', {
        headers: { 'x-internal-call': 'true' }
      });
      const data = await response.json();
      const allSkills = data.skills || [];

      let filteredSkills = allSkills;
      if (hasLimitedAccess) {
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
    } catch (error) {
      console.error('Error loading skills:', error);
    }
  };

  const checkApiConfiguration = async () => {
    try {
      const currentModel = availableModels.find(m => m.id === selectedModel);
      if (!currentModel) return;

      const response = await fetch(currentModel.apiRoute, { method: 'GET' });
      const data = await response.json();
      setIsApiConfigured(data.configured);
    } catch (error) {
      setIsApiConfigured(false);
    }
  };

  const loadConversations = async () => {
    if (!userId) return;
    try {
      setIsLoadingSessions(true);
      const conversations = await conversationService.getConversations(userId);
      const chatSessions: ChatSession[] = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: (conv.messages || []).map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          model: msg.model
        })),
        createdAt: conv.created_at,
        model: conv.model,
        userId: conv.user_id
      }));
      setSessions(chatSessions);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

const createNewSession = async () => {
    if (!userId) return null;
    try {
      const newConversation = await conversationService.createConversation(userId, {
        title: 'New Conversation',
        model: selectedModel
      });
      const newSession: ChatSession = {
        id: newConversation.id,
        title: newConversation.title,
        messages: [],
        createdAt: newConversation.created_at,
        model: newConversation.model,
        userId: newConversation.user_id
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const saveMessage = async (conversationId: string, message: { role: 'user' | 'assistant', content: string, model?: string }) => {
    if (!userId) return;
    try {
      await conversationService.addMessage(conversationId, message);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isApiConfigured) return;

    let session = currentSession;
    const inputText = input.trim();

    if (!session) {
      const newSession = await createNewSession();
      if (!newSession) return;
      session = newSession;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };

    const updatedSession = { ...session, messages: [...session.messages, userMessage] };
    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));

    setInput('');
    setIsLoading(true);

    try {
      const currentModel = availableModels.find(m => m.id === selectedModel);
      if (!currentModel) return;

      const response = await fetch(currentModel.apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputText,
          context: { currentPath: '/home/dentaldiamondhn/diamond-link' },
          userRole: userRole,
          userId: userId,
          conversationId: session.id,
          agentMode: agentMode ? agentMode : undefined,
          skillId: agentMode && selectedSkill ? selectedSkill : undefined
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        model: selectedModel
      };

      const finalSession = { ...updatedSession, messages: [...updatedSession.messages, assistantMessage] };
      setCurrentSession(finalSession);
      setSessions(prev => prev.map(s => s.id === session.id ? finalSession : s));

      if (session.messages.length === 0) {
        const newTitle = inputText.substring(0, 30) + (inputText.length > 30 ? '...' : '');
        await conversationService.updateConversation(session.id, userId!, { title: newTitle });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = { ...userMessage, content: 'Sorry, I encountered an error. Please try again.' };
      setCurrentSession({ ...updatedSession, messages: [...updatedSession.messages.slice(0, -1), errorMsg] });
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

return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Modern Sidebar - Claude/Gemini style */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bot size={20} className="text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Multi-Model Chat</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={createNewSession}
            disabled={!isApiConfigured}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${!sidebarOpen ? 'px-3' : ''}`}
          >
            <Plus size={18} />
            {sidebarOpen && <span>New Chat</span>}
          </button>
        </div>

        {/* Model Selector */}
        {sidebarOpen && (
          <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Model</div>
            <div className="space-y-2">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    selectedModel === model.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <span className="text-lg">{model.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${selectedModel === model.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
                      {model.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{model.provider}</div>
                  </div>
                  {model.isFree && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                      Free
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Agent Mode Toggle */}
        {sidebarOpen && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Mode</span>
              </div>
              <button
                onClick={() => setAgentMode(!agentMode)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  agentMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                  agentMode ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        )}

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {sidebarOpen && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">History</span>
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <Settings size={14} className="text-gray-500" />
              </button>
            </div>
          )}
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                    currentSession?.id === session.id
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        currentSession?.id === session.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {session.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                        {session.messages.length} msgs
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButton: "hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">{userRole?.replace('_', ' ')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active now</div>
              </div>
              <div className={`w-2 h-2 rounded-full ${isApiConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area - Clean centered layout */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Page Title */}
            <div className="flex items-center">
              {/* Navigation Dropdown */}
              <div className="relative mr-4">
                <button
                  onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Menu size={18} className="text-gray-600 dark:text-gray-300" />
                  <ChevronDown size={14} className="text-gray-600 dark:text-gray-300" />
                </button>

                {navDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="p-2">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setNavDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <i className={`${item.icon} w-5 text-center`}></i>
                          <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                {availableModels.find(m => m.id === selectedModel)?.name}
              </h1>
              {agentMode && (
                <span className="ml-3 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                  <Zap size={10} />
                  Agent
                </span>
              )}
              {currentSession && (
                <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                  {currentSession.messages.length} messages
                </p>
              )}
            </div>

            {/* Right side - User Info and Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Skill Selector */}
              {agentMode && skills.length > 0 && (
                <select
                  value={selectedSkill || ''}
                  onChange={(e) => setSelectedSkill(e.target.value || null)}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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
              )}

              {/* Header Actions - Left of User Info */}
              <div className="hidden sm:flex items-center space-x-3">
                {/* Dark Mode Toggle */}
                <DarkModeToggle />

                {/* Notifications */}
                <NotificationDropdown />
              </div>

              {/* Mobile Actions */}
              <div className="flex sm:hidden items-center space-x-2">
                <DarkModeToggle />
                <NotificationDropdown />
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* User Name and Email - Hidden on mobile */}
                <div className="hidden sm:block text-right">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm lg:text-lg font-semibold text-gray-900 truncate max-w-[100px] lg:max-w-none">
                      {user?.firstName || 'Usuario'} {user?.lastName || ''}
                    </h2>
                    {/* Role Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeInfo.bgColor} ${roleBadgeInfo.textColor} ${roleBadgeInfo.borderColor} border`}>
                      <i className={`${roleBadgeInfo.icon} mr-1`}></i>
                      {roleBadgeInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate max-w-[120px] lg:max-w-none">
                    {user?.emailAddresses?.[0]?.emailAddress || 'usuario@ejemplo.com'}
                  </p>
                </div>

                {/* Clerk User Avatar */}
                <div className="relative flex-shrink-0">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 lg:w-10 lg:h-10 shadow-md",
                        userButton: "hover:bg-gray-100 rounded-lg transition-colors"
                      }
                    }}
                  />
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {currentSession ? (
          <>
            {/* Messages - Centered content like Claude */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
                {currentSession.messages.length === 0 && !isLoading && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Sparkles size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      How can I help you today?
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                      I'm your AI coding assistant. I can help with writing code, debugging, explaining concepts,
                      and more. Just tell me what you need.
                    </p>
                  </div>
                )}

                {currentSession.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-4 max-w-2xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className="w-8 h-8 flex-shrink-0 mt-1">
                        {message.role === 'user' && user?.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt="User avatar"
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : message.role === 'user' ? (
                          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User size={16} className="text-gray-600 dark:text-gray-300" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Bot size={16} className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`flex flex-col gap-1.5 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-md'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-md'
                        }`}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 px-1.5">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-4 max-w-2xl">
                      <div className="w-8 h-8 flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <Bot size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="px-5 py-4 rounded-2xl rounded-tl-md bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area - Clean and centered */}
            <div className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
              <div className="max-w-3xl mx-auto p-6">
                {!isApiConfigured && (
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      {selectedModel === 'groq-llama' ? 'Configure GROQ_API_KEY in .env to start chatting' : 'Configure Odysseus credentials to start chatting'}
                    </p>
                  </div>
                )}
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isApiConfigured ? "Type your message..." : "API not configured"}
                    disabled={!isApiConfigured || isLoading}
                    rows={1}
                    className="w-full px-5 py-4 pr-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 resize-none shadow-sm text-base"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading || !isApiConfigured}
                    className="absolute right-3 bottom-3 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>Enter to send • Shift + Enter for new line</span>
                  <span>{input.length}/2000</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          // No session - Welcome screen
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-2xl">
              <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Bot size={56} className="text-white" />
              </div>

              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {availableModels.find(m => m.id === selectedModel)?.name} Assistant
              </h1>

              <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto">
                Your AI coding companion for writing, debugging, and understanding code.
              </p>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <button
                  onClick={() => setInput("Help me write a React component")}
                  disabled={!isApiConfigured}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Code2 size={24} className="mx-auto mb-2 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Write Code</span>
                </button>
                <button
                  onClick={() => setInput("Explain this error: undefined")}
                  disabled={!isApiConfigured}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Bot size={24} className="mx-auto mb-2 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Debug Help</span>
                </button>
                <button
                  onClick={() => setInput("Explain React hooks")}
                  disabled={!isApiConfigured}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Brain size={24} className="mx-auto mb-2 text-pink-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Learn</span>
                </button>
              </div>

              <button
                onClick={createNewSession}
                disabled={!isApiConfigured}
                className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg"
              >
                Start a conversation
              </button>

              {!isApiConfigured && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 max-w-md mx-auto">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedModel === 'groq-llama' ? 'Add GROQ_API_KEY to your .env file' : 'Configure Odysseus credentials'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}