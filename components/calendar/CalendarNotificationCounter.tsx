'use client';

import React, { useState, useEffect } from 'react';
import calendarRealtimeService, { CalendarRealtimeNotification } from '../../services/calendarRealtimeService';

interface CalendarNotificationCounterProps {
  className?: string;
}

export const CalendarNotificationCounter: React.FC<CalendarNotificationCounterProps> = ({ className = '' }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to real-time notifications
    const unsubscribe = calendarRealtimeService.onNotification((notification: CalendarRealtimeNotification) => {
      // Increment counter
      setUnreadCount(prev => prev + 1);
      
      // Auto-remove from counter after 5 seconds (but keep in list)
      setTimeout(() => {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }, 5000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[1.25rem] h-5">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
};
