'use client';

import React, { useState, useEffect } from 'react';
import { PwaCalendarWidget } from '@/components/calendar/PwaCalendarWidget';
import { useUser } from '@clerk/nextjs';
import { CalendarService } from '@/services/calendarService';
import { CalendarTaskService } from '@/services/calendarTaskService';

export default function CalendarWidgetPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load events and tasks for the current user
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
    <PwaCalendarWidget
      events={events}
      tasks={tasks}
      onEventClick={handleEventClick}
      onTaskClick={handleTaskClick}
      onAddEvent={handleAddEvent}
      onAddTask={handleAddTask}
    />
  );
}
