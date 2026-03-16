'use client';

import React from 'react';
import TechSupportLayout from '../../components/tech-support/TechSupportLayout';
import { useRouter } from 'next/navigation';

export default function TechSupportDashboard() {
  const router = useRouter();

  return (
    <TechSupportLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">🛠 Tech Support Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">🚀 Quick Actions</h2>
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/tech-support/claude-chat')}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  💬 Open Claude Chat
                </button>
                <button
                  onClick={() => window.open('https://claude.ai/code', '_blank')}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🌐 Claude Code Web
                </button>
              </div>
            </div>

            {/* Tools & Resources */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">🛠 Tools & Resources</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">📋 Dependencies Implementation</h3>
                  <a
                    href="/tech-support/dependencies"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View Roadmap →
                  </a>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">📚 Documentation</h3>
                  <a
                    href="/tech-support/docs"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View Docs →
                  </a>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">🔧 System Status</h3>
                  <button
                    onClick={() => window.open('/api/system-status', '_blank')}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Check Status →
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">📊 Recent Activity</h2>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">Claude Code Integration</div>
                      <div className="text-sm text-gray-600">Completed successfully</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">2 hours ago</div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">Calendar Notifications Fixed</div>
                      <div className="text-sm text-gray-600">Auto-refresh working</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">1 day ago</div>
                </div>
              </div>
            </div>

            {/* Help & Support */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">💡 Help & Support</h2>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="font-medium mb-2">📖 Need Help?</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Access the comprehensive tech support documentation and get help with Diamond Link development.
                  </p>
                  <a
                    href="/tech-support/docs"
                    className="inline-block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  >
                    View Documentation
                  </a>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-medium mb-2">🐛 Report Issues</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Found a bug or need technical assistance? Report it for quick resolution.
                  </p>
                  <button
                    onClick={() => window.open('https://github.com/dentaldiamondhn/diamond-link/issues', '_blank')}
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Report on GitHub
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TechSupportLayout>
  );
}
