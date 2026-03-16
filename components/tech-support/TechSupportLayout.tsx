'use client';

import { React } from 'react';
import ClaudeChat from './ClaudeChat';

interface TechSupportLayoutProps {
  children: React.ReactNode;
}

export default function TechSupportLayout({ children }: TechSupportLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tech Support Navigation */}
      <div className="flex">
        <div className="w-64 bg-gray-900 text-white">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">🛠 Tech Support</h2>
            <nav className="space-y-2">
              <a
                href="/tech-support"
                className="block px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                🏠 Dashboard
              </a>
              <a
                href="/tech-support/claude-chat"
                className="block px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                💬 Claude Chat
              </a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
