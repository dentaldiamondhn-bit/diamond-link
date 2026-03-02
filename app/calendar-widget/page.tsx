'use client';

import React, { useState, useEffect } from 'react';
import { PwaCalendarWidget } from '@/components/calendar/PwaCalendarWidget';
import { useUser } from '@clerk/nextjs';
import { CalendarService } from '@/services/calendarService';
import { CalendarTaskService } from '@/services/calendarTaskService';
import { Calendar, Plus, Download, Home } from 'lucide-react';

export default function CalendarWidgetPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Set dedicated manifest for calendar widget
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (link) {
      link.href = '/calendar-widget-manifest.json';
    } else {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/calendar-widget-manifest.json';
      document.head.appendChild(manifestLink);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // Load events and tasks for current user
    const loadData = async () => {
      try {
        const currentMonth = new Date();
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        // Load events
        const eventsData = await CalendarService.getEventsByDateRange(
          startDate.toISOString(),
          endDate.toISOString(),
          user?.id || ''
        );
        setEvents(eventsData || []);

        // Load tasks
        const tasksData = await CalendarTaskService.getTasksByDateRange(
          startDate.toISOString(),
          endDate.toISOString(),
          user?.id || ''
        );
        setTasks(tasksData || []);
      } catch (error) {
        console.error('Error loading calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      loadData();
    }
  }, [user, isLoaded]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    }
  };

  const handleEventClick = (event: any) => {
    // Navigate to full calendar app with event selected
    window.location.href = `/calendario?event=${event.id}`;
  };

  const handleTaskClick = (task: any) => {
    // Navigate to full calendar app with task selected
    window.location.href = `/calendario?task=${task.id}`;
  };

  const handleAddEvent = (date: Date) => {
    // Navigate to full calendar app with pre-selected date
    const dateStr = date.toISOString().split('T')[0];
    window.location.href = `/calendario?date=${dateStr}&action=add-event`;
  };

  const handleAddTask = (date: Date) => {
    // Navigate to full calendar app with pre-selected date
    const dateStr = date.toISOString().split('T')[0];
    window.location.href = `/calendario?date=${dateStr}&action=add-task`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Installation Banner */}
      {!isInstalled && (
        <div className="bg-blue-600 text-white p-4 text-center">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6" />
              <div>
                <h2 className="font-semibold">Install Calendar Widget</h2>
                <p className="text-sm opacity-90">Add this calendar widget to your home screen for quick access</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Install Widget</span>
                </button>
              )}
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors flex items-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Main App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PwaCalendarWidget
        events={events}
        tasks={tasks}
        onEventClick={handleEventClick}
        onTaskClick={handleTaskClick}
        onAddEvent={handleAddEvent}
        onAddTask={handleAddTask}
      />
    </div>
  );
}
