'use client';

import React, { useState, useEffect } from 'react';
import { PwaCalendarWidget } from '@/components/calendar/PwaCalendarWidget';
import { useUser } from '@clerk/nextjs';

export default function CalendarWidgetPage() {
  const { user } = useUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load events for the current user
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/calendar/events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadEvents();
    }
  }, [user]);

  const handleEventClick = (event: any) => {
    // Navigate to full calendar app with event selected
    window.location.href = `/calendario?event=${event.id}`;
  };

  const handleAddEvent = (date: Date) => {
    // Navigate to full calendar app with pre-selected date
    const dateStr = date.toISOString().split('T')[0];
    window.location.href = `/calendario?date=${dateStr}&action=add`;
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
      onEventClick={handleEventClick}
      onAddEvent={handleAddEvent}
    />
  );
}
