'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

interface Message {
  id: string;
  type: 'user' | 'claude' | 'system';
  content: string;
  timestamp: string;
}

interface ClaudeChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaudeChat({ isOpen, onClose }: ClaudeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState('tech-support');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

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

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    addMessage('user', userMessage);

    try {
      const response = await fetch('/api/claude-chat', {
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
      
      if (result.response) {
        addMessage('claude', result.response);
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
            <h3 className="text-sm font-medium mb-4 text-gray-300">Agent Selection</h3>
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
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
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
                placeholder="Ask Claude Code about Diamond Link..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
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

export default ClaudeChat;
