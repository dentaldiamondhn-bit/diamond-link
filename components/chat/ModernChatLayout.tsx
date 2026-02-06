'use client';

import React, { useState, Suspense } from 'react';
import { ModernChatSidebar } from './ModernChatSidebar';
import { ChatMessageArea } from './ChatMessageArea';
import { useUser } from '@clerk/nextjs';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ModernChatLayout Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Something went wrong
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {this.state.error?.message || 'An error occurred in the chat layout'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ModernChatLayout: React.FC = () => {
  const { user } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversationName, setSelectedConversationName] = useState<string>('');
  const [selectedConversationType, setSelectedConversationType] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleConversationSelect = (conversationId: string, conversationName?: string, conversationType?: string) => {
    console.log('ModernChatLayout: Conversation selected:', conversationId);
    setSelectedConversationId(conversationId);
    setSelectedConversationName(conversationName || '');
    setSelectedConversationType(conversationType || '');
  };

  if (!user) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <i className="fas fa-comments text-white text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Dental Clinic Chat
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Please sign in to access the chat system
            </p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-white dark:bg-slate-900 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}>
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          }>
            <ModernChatSidebar
              selectedConversationId={selectedConversationId}
              onConversationSelect={handleConversationSelect}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </Suspense>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 h-full flex flex-col overflow-hidden relative">
          {selectedConversationId ? (
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            }>
              <ChatMessageArea 
                conversationId={selectedConversationId} 
                conversationName={selectedConversationName}
                conversationType={selectedConversationType}
              />
            </Suspense>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="text-center max-w-md mx-4">
                <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <i className="fas fa-comments text-white text-4xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  Welcome to Dental Clinic Chat
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                  Connect with your team and collaborate on patient care in real-time
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-users text-blue-600 dark:text-blue-400"></i>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Team Chat</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Collaborate with your entire team</p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-user-md text-green-600 dark:text-green-400"></i>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Direct Messages</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">One-on-one conversations</p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <i className="fas fa-user-injured text-purple-600 dark:text-purple-400"></i>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Patient Cases</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Secure patient discussions</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};
