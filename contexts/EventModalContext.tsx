'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { CalendarEvent } from '../types/calendar';

interface EventModalContextType {
  isEventModalOpen: boolean;
  selectedEvent: CalendarEvent | null;
  openEventModal: (event: CalendarEvent) => void;
  closeEventModal: () => void;
}

const EventModalContext = createContext<EventModalContextType | undefined>(undefined);

export function EventModalProvider({ children }: { children: ReactNode }) {
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const openEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <EventModalContext.Provider value={{
      isEventModalOpen,
      selectedEvent,
      openEventModal,
      closeEventModal
    }}>
      {children}
    </EventModalContext.Provider>
  );
}

export function useEventModal() {
  const context = useContext(EventModalContext);
  if (context === undefined) {
    throw new Error('useEventModal must be used within an EventModalProvider');
  }
  return context;
}
