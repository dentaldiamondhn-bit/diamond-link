'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

interface Message {
  id: string;
  type: 'user' | 'claude' | 'system';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  agent: string;
  createdAt: string;
  updatedAt: string;
}

interface ClaudeChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaudeChat({ isOpen, onClose }: ClaudeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState('tech-support');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'required' | 'authenticated' | 'error'>('checking');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [showConversationList, setShowConversationList] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  // Load conversations from localStorage
  useEffect(() => {
    const savedConversations = localStorage.getItem('claude-conversations');
    if (savedConversations) {
      try {
        const convos = JSON.parse(savedConversations);
        setConversations(convos);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }
  }, []);

  // Auto-save current conversation
  useEffect(() => {
    if (messages.length > 0 && currentConversationId) {
      const updatedConversations = conversations.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, messages, updatedAt: new Date().toISOString() }
          : conv
      );
      setConversations(updatedConversations);
      localStorage.setItem('claude-conversations', JSON.stringify(updatedConversations));
    }
  }, [messages, currentConversationId, conversations]);

  // Load message history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('claude-chat-history');
    if (saved) {
      try {
        const history = JSON.parse(saved);
        setMessages(history);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save message history to localStorage
  useEffect(() => {
    localStorage.setItem('claude-chat-history', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (type: Message['type'], content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (authStatus !== 'authenticated') {
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    addMessage('user', userMessage);

    try {
      const response = await fetch('/api/claude-chat-sim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          agent: currentAgent,
          project: 'diamond-link'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.requiresAuth) {
        setAuthStatus('required');
        addMessage('claude', result.response);
      } else if (result.response) {
        addMessage('claude', result.response);
        
        // Auto-save if we have a conversation
        if (currentConversationId) {
          saveCurrentConversation();
        } else if (messages.length > 0) {
          // Create new conversation if this is the first message
          createNewConversation();
        }
      } else {
        addMessage('claude', 'Sorry, I encountered an error processing your request.');
      }
    } catch (error) {
      console.error('Error sending to Claude:', error);
      addMessage('claude', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('claude-chat-history');
  };

  const setAgent = (agent: string) => {
    setCurrentAgent(agent);
    addMessage('system', `Switched to ${agent} agent`);
  };

  // Conversation management functions
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      title: conversationTitle || `New Conversation ${conversations.length + 1}`,
      messages: [],
      agent: currentAgent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setConversations([...conversations, newConversation]);
    setCurrentConversationId(newId);
    setMessages([]);
    setConversationTitle('');
    setShowConversationList(false);
    localStorage.setItem('claude-conversations', JSON.stringify([...conversations, newConversation]));
  };

  const loadConversation = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
      setCurrentAgent(conversation.agent);
      setShowConversationList(false);
    }
  };

  const saveCurrentConversation = async () => {
    if (!currentConversationId && messages.length > 0) {
      createNewConversation();
    } else if (currentConversationId) {
      const conversation = conversations.find(conv => conv.id === currentConversationId);
      if (conversation) {
        const updatedConversation = {
          ...conversation,
          messages,
          agent: currentAgent,
          updatedAt: new Date().toISOString()
        };
        
        const updatedConversations = conversations.map(conv => 
          conv.id === currentConversationId ? updatedConversation : conv
        );
        
        setConversations(updatedConversations);
        localStorage.setItem('claude-conversations', JSON.stringify(updatedConversations));
      }
    }
  };

  const deleteConversation = (conversationId: string) => {
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    localStorage.setItem('claude-conversations', JSON.stringify(updatedConversations));
    
    if (currentConversationId === conversationId) {
      setCurrentConversationId('');
      setMessages([]);
    }
  };

  const exportConversation = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      const exportData = {
        title: conversation.title,
        agent: conversation.agent,
        createdAt: conversation.createdAt,
        messages: conversation.messages,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  // Only render for tech-support users
  const userRole = user?.publicMetadata?.role || user?.privateMetadata?.role;
  const isTechSupport = userRole === 'admin' || userRole === 'tech_support' || userRole === 'developer';

  if (!isTechSupport) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">This feature is only available to technical support staff.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 flex z-50">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 bg-gray-900 text-white flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Claude Code</h2>
                <p className="text-xs text-gray-400">Diamond Link Tech Support</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-4">
            <h3 className="text-sm font-medium mb-4 text-gray-300">Conversations</h3>
            
            {/* New Conversation */}
            <div className="mb-4">
              <input
                type="text"
                value={conversationTitle}
                onChange={(e) => setConversationTitle(e.target.value)}
                placeholder="New conversation title..."
                className="w-full px-3 py-2 bg-gray-800 text-white rounded text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    createNewConversation();
                  }
                }}
              />
              <button
                onClick={createNewConversation}
                className="w-full mt-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
              >
                ➕ New Conversation
              </button>
            </div>

            {/* Conversation List */}
            <div className="mb-4">
              <button
                onClick={() => setShowConversationList(!showConversationList)}
                className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                📚 {showConversationList ? 'Hide' : 'Show'} Conversations ({conversations.length})
              </button>
            </div>

            {showConversationList && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      currentConversationId === conversation.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div
                      onClick={() => loadConversation(conversation.id)}
                      className="flex-1"
                    >
                      <div className="font-medium text-xs truncate">{conversation.title}</div>
                      <div className="text-xs opacity-75">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs opacity-75">
                        {conversation.messages.length} messages
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => exportConversation(conversation.id)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        title="Export conversation"
                      >
                        📥
                      </button>
                      <button
                        onClick={() => deleteConversation(conversation.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        title="Delete conversation"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Conversation Info */}
            {currentConversationId && (
              <div className="mt-4 p-2 bg-gray-700 rounded">
                <div className="text-xs text-gray-300">Current:</div>
                <div className="text-xs text-white truncate">
                  {conversations.find(c => c.id === currentConversationId)?.title}
                </div>
                <button
                  onClick={saveCurrentConversation}
                  className="mt-2 w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  💾 Save Current
                </button>
              </div>
            )}

            <h3 className="text-sm font-medium mb-4 mt-6 text-gray-300">Agent Selection</h3>
            <div className="space-y-2">
              <button
                onClick={() => setAgent('tech-support')}
                className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                  currentAgent === 'tech-support' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🛠 Tech Support
              </button>
              <button
                onClick={() => setAgent('code-reviewer')}
                className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                  currentAgent === 'code-reviewer' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🔍 Code Reviewer
              </button>
              <button
                onClick={() => setAgent('debugger')}
                className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                  currentAgent === 'debugger' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🐛 Debugger
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={clearChat}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                🗑️ Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              Claude Code Interface
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  authStatus === 'authenticated' ? 'bg-green-500' : 
                  authStatus === 'required' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {authStatus === 'authenticated' ? 'Connected' : 
                   authStatus === 'required' ? 'Authentication Required' : 
                   authStatus === 'checking' ? 'Checking...' : 'Error'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Authentication Status */}
            {authStatus === 'required' && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                    🔐
                  </div>
                  <div>
                    <h3 className="font-medium text-yellow-800 mb-2">Claude Code Authentication Required</h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Claude Code requires an Anthropic subscription or API key to work.
                    </p>
                    <div className="text-xs text-yellow-600">
                      <p className="mb-2"><strong>To set up Claude Code:</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Get API key from <a href="https://console.anthropic.com/" target="_blank" className="underline">console.anthropic.com</a></li>
                        <li>Run: <code className="bg-yellow-100 px-1 rounded">claude-code auth login</code></li>
                        <li>Or set: <code className="bg-yellow-100 px-1 rounded">export ANTHROPIC_API_KEY=your_key</code></li>
                        <li>Refresh this page after authentication</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  } mb-4`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {message.type === 'user' ? 'You' : 'Claude'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    sendMessage();
                  }
                }}
                placeholder={authStatus === 'required' ? '🔐 Authentication required to use Claude Code' : 'Ask Claude Code about Diamond Link...'}
                disabled={isLoading || authStatus !== 'authenticated'}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || authStatus !== 'authenticated'}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-t-2 border-r-transparent border-b-white animate-spin rounded-full"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
