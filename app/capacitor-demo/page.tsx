'use client';

import { useEffect, useState } from 'react';
import CapacitorDemo from '@/components/CapacitorDemo';
import { Capacitor } from '@capacitor/core';
import { useUser, UserButton } from '@clerk/nextjs';
import { registerServiceWorker } from '@/lib/serviceWorker';
import { AppHeader } from '@/components/AppHeader';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { BellNotificationProvider } from '@/contexts/BellNotificationContext';
import { NotificationListenerWrapper } from '@/components/notifications/NotificationListenerWrapper';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AdminSidebar from '@/components/AdminSidebar';
import DoctorSidebar from '@/components/DoctorSidebar';
import StaffSidebar from '@/components/StaffSidebar';
import TechSupportSidebar from '@/components/TechSupportSidebar';
import AnimatedBurger from '@/components/AnimatedBurger';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { TutorialProvider } from '@/contexts/TutorialContext';

export default function CapacitorDemoPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSignedIn, user } = useUser();
  const { userRole } = useRoleBasedAccess();

  useEffect(() => {
    // Initialize service worker for notifications
    const initializeServiceWorker = async () => {
      try {
        await registerServiceWorker();
        console.log('✅ Service Worker initialized for capacitor-demo');
      } catch (error) {
        console.warn('⚠️ Service Worker initialization failed:', error);
      }
    };

    // Initialize service worker immediately
    initializeServiceWorker();

    // Simulate loading time for demo purposes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TutorialProvider>
      <ThemeProvider>
        <BellNotificationProvider>
          <NotificationListenerWrapper>
          <div className="flex h-screen bg-gray-100 relative">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 active:scale-95 group"
              aria-label="Toggle menu"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <AnimatedBurger />
              </div>
            </button>

            {/* Mobile Overlay */}
            {sidebarOpen && (
              <div
                className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Role-based Sidebar */}
            <div className={`
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
              lg:translate-x-0 fixed lg:relative lg:flex-shrink-0 
              transition-transform duration-300 ease-in-out z-50 lg:z-auto
            `}>
              <div className="w-64 lg:w-64 bg-gray-900 text-white flex flex-col h-screen overflow-y-auto">
                {userRole === 'tech_support' && <TechSupportSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                {userRole === 'admin' && <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                {userRole === 'doctor' && <DoctorSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                {userRole === 'staff' && <StaffSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
                
                {/* Fallback sidebar if role detection fails */}
                {(!userRole || !['tech_support', 'admin', 'doctor', 'staff'].includes(userRole)) && (
                  <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
                    <div className="p-6 border-b border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                          <i className="fas fa-exclamation-triangle text-white"></i>
                        </div>
                        <div>
                          <h1 className="text-xl font-bold text-white">Unknown Role</h1>
                          <p className="text-xs text-gray-400">{userRole || 'undefined'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-0 overflow-auto flex flex-col">
              {/* Header with User Info */}
              <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Left side - Page Title */}
                  <div className="flex items-center">
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                      📱 Capacitor Integration Demo
                    </h1>
                  </div>
                  
                  {/* Right side - User Info and Actions */}
                  <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
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
              
              {/* Page Content */}
              <div className="flex-1 p-6 overflow-auto">
                {/* Loading State */}
                {isLoading && (
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">Loading Capacitor Demo...</p>
                    </div>
                  </div>
                )}

                {/* Main Content */}
                {!isLoading && (
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                      {/* Header */}
                      <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          📱 Capacitor Integration Demo
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                          Test mobile app features including notifications, deep links, and more
                        </p>
                        <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Platform: {(() => {
                            try {
                              return (Capacitor as any).getPlatform() || 'web';
                            } catch (error) {
                              return 'web';
                            }
                          })()}
                        </div>
                      </div>

                      {/* Authentication Notice */}
                      {!isSignedIn && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ Some features may require authentication. Sign in for full functionality.
                          </p>
                        </div>
                      )}

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
                              Notification permissions
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Push notification registration
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Local notification scheduling
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Deep link handling
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Patient record access
                            </li>
                          </ul>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            📱 Platform Support
                          </h3>
                          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              iOS Safari (PWA)
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Android Chrome (PWA)
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Desktop browsers
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Capacitor native apps
                            </li>
                            <li className="flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Progressive Web Apps
                            </li>
                          </ul>
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
                        <div className="mt-4 text-sm">
                          <span className="font-medium">Authentication:</span>
                          <span className="opacity-90 ml-2">
                            {isSignedIn ? '✅ Signed in as ' + user?.firstName || user?.emailAddresses?.[0]?.emailAddress : '⚠️ Not signed in'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </NotificationListenerWrapper>
      </BellNotificationProvider>
    </ThemeProvider>
  </TutorialProvider>
  );
}
