'use client';

import { useEffect, useState } from 'react';
import CapacitorDemo from '@/components/CapacitorDemo';
import { Capacitor } from '@capacitor/core';

export default function CapacitorDemoPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for demo purposes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Capacitor Demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📱 Capacitor Integration Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test mobile app features including notifications, deep links, and more
          </p>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Platform: {Capacitor.getPlatform() || 'web'}
          </div>
        </div>

        {/* Demo Component */}
        <CapacitorDemo />

        {/* Additional Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              🎯 Features Tested
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Local Notifications
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Push Notifications (Native)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Deep Linking
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Appointment Reminders
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Share Functionality
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              📱 Platform Differences
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Web:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  Browser notifications, URL navigation, clipboard sharing
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Native:</span>
                <p className="text-gray-600 dark:text-gray-400">
                  System notifications, deep links, native sharing, push tokens
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">
            🚀 Capacitor Stack Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="block font-medium">Configuration</span>
              <span className="opacity-90">✅ Complete</span>
            </div>
            <div>
              <span className="block font-medium">Services</span>
              <span className="opacity-90">✅ Implemented</span>
            </div>
            <div>
              <span className="block font-medium">Integration</span>
              <span className="opacity-90">✅ Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
