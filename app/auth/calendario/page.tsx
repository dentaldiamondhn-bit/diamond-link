'use client'

import { useState, useEffect } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar-styles.css'
import { useUser } from '@clerk/nextjs'
import { CalendarEvent } from '@/types/calendar'
import { googleCalendarService } from '@/services/googleCalendar'
import { EventModal } from '@/components/calendar/EventModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const locales = {
  'es-ES': es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const culture = 'es-ES'

export default function CalendarioPage() {
  const { isSignedIn, user } = useUser()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (isSignedIn) {
      checkGoogleConnection()
      loadEvents()
    }
  }, [isSignedIn])

  const checkGoogleConnection = async () => {
    try {
      const connected = await googleCalendarService.isConnected()
      setIsConnected(connected)
    } catch (err) {
      console.error('Error checking Google connection:', err)
      setIsConnected(false)
    }
  }

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const calendarEvents = await googleCalendarService.getEvents()
      setEvents(calendarEvents)
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      await googleCalendarService.connect()
      setIsConnected(true)
      await loadEvents()
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Calendar')
    }
  }

  const handleSelectSlot = ({ start, end }: any) => {
    setSelectedEvent({
      id: '',
      title: '',
      start,
      end,
      allDay: false,
    })
    setShowModal(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (selectedEvent?.id) {
        await googleCalendarService.updateEvent(selectedEvent.id, eventData)
      } else {
        await googleCalendarService.createEvent(eventData)
      }
      await loadEvents()
      setShowModal(false)
      setSelectedEvent(null)
    } catch (err: any) {
      setError(err.message || 'Failed to save event')
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await googleCalendarService.deleteEvent(eventId)
      await loadEvents()
      setShowModal(false)
      setSelectedEvent(null)
    } catch (err: any) {
      setError(err.message || 'Failed to delete event')
    }
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Por favor inicia sesión para acceder al calendario</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {!isConnected ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <div className="mb-4">
            <i className="fab fa-google text-6xl text-blue-500"></i>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Conectar con Google Calendar</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Conecta tu cuenta de Google Calendar para sincronizar y gestionar tus eventos
          </p>
          <button
            onClick={handleConnectGoogle}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <i className="fab fa-google mr-2"></i>
            Conectar Google Calendar
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando eventos del calendario...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Eventos del Calendario</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={loadEvents}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                title="Actualizar eventos"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setView(Views.MONTH)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                    view === Views.MONTH
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Mes
                </button>
                <button
                  onClick={() => setView(Views.WEEK)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                    view === Views.WEEK
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <i className="fas fa-calendar-week mr-2"></i>
                  Semana
                </button>
                <button
                  onClick={() => setView(Views.DAY)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                    view === Views.DAY
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <i className="fas fa-calendar-day mr-2"></i>
                  Día
                </button>
                <button
                  onClick={() => setDate(new Date())}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fas fa-home mr-2"></i>
                  Hoy
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(date)
                    newDate.setDate(newDate.getDate() - 7)
                    setDate(newDate)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-all duration-200 transform hover:scale-105"
                >
                  <i className="fas fa-chevron-left mr-2"></i>
                  Anterior
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(date)
                    newDate.setDate(newDate.getDate() + 7)
                    setDate(newDate)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Siguiente
                  <i className="fas fa-chevron-right ml-2"></i>
                </button>
              </div>
            </div>
          </div>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            date={date}
            onNavigate={setDate}
            onView={setView}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            style={{ height: 600 }}
            className="rounded-lg dark:bg-gray-800"
          />
        </div>
      )}

      {showModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowModal(false)
            setSelectedEvent(null)
          }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  )
}
