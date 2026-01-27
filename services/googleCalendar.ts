import { CalendarEvent } from '@/types/calendar'

class GoogleCalendarService {
  async isConnected(): Promise<boolean> {
    try {
      const response = await fetch('/api/google-calendar/status')
      if (!response.ok) {
        return false
      }
      const data = await response.json()
      return data.connected
    } catch (error) {
      console.error('Connection check error:', error)
      return false
    }
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch('/api/google-calendar/connect')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to connect to Google Calendar')
      }
      const data = await response.json()
      if (!data.authUrl) {
        throw new Error('No authentication URL received')
      }
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Google Calendar connection error:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to connect to Google Calendar')
    }
  }

  async getEvents(): Promise<CalendarEvent[]> {
    try {
      const response = await fetch('/api/google-calendar/events')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch events')
      }
      
      const events = await response.json()
      return events.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  }

  async createEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await fetch('/api/google-calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const event = await response.json()
      return {
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }
    } catch (error) {
      throw new Error('Failed to create event')
    }
  }

  async updateEvent(eventId: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await fetch(`/api/google-calendar/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      const event = await response.json()
      return {
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }
    } catch (error) {
      throw new Error('Failed to update event')
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const response = await fetch(`/api/google-calendar/events/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }
    } catch (error) {
      throw new Error('Failed to delete event')
    }
  }
}

export const googleCalendarService = new GoogleCalendarService()
