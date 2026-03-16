'use client';

import React, { useState } from 'react';
import TechSupportLayout from '@/components/tech-support/TechSupportLayout';
import ClaudeChat from '@/components/tech-support/ClaudeChat';

export default function ClaudeChatPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <TechSupportLayout>
      <div className="relative h-full">
        {/* Floating Chat Button */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
          title="Open Claude Chat"
        >
          💬
        </button>

        {/* Chat Modal */}
        {isChatOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                  Claude Code - Tech Support
                </h2>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Chat Component */}
              <div className="flex-1 overflow-hidden">
                <ClaudeChat
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </TechSupportLayout>
  );
}
