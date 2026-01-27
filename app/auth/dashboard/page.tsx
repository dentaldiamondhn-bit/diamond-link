// app/dashboard/page.tsx
'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PatientService } from '../../../services/patientService';
import { googleCalendarService } from '../../../services/googleCalendar';
import { useRoleBasedAccess } from '../../../hooks/useRoleBasedAccess';
import { EventModal } from '../../../components/calendar/EventModal';
import { CalendarEvent } from '../../../types/calendar';
import { useEventModal } from '../../../contexts/EventModalContext';

export default function DashboardPage() {
  const { user } = useUser();
  const { userRole, permissions, hasPermission } = useRoleBasedAccess();
  const { openEventModal, closeEventModal, isEventModalOpen, selectedEvent } = useEventModal();
  const [patientCount, setPatientCount] = useState<number>(0);
  const [eventCount, setEventCount] = useState<number>(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [eventsLoading, setEventsLoading] = useState<boolean>(true);

  // Helper function to format event time
  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `en ${diffDays} días`;
    } else if (diffHours > 0) {
      return `en ${diffHours} horas`;
    } else if (diffHours > -1) {
      return 'en 1 hora';
    } else {
      return 'hoy';
    }
  };

  // Handle event click to open modal
  const handleEventClick = (event: any) => {
    // Convert event to CalendarEvent format
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title || 'Evento programado',
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay || false,
      description: event.description || '',
      location: event.location || ''
    };
    openEventModal(calendarEvent);
  };

  // Handle create new event
  const handleCreateEvent = () => {
    const newEvent: CalendarEvent = {
      id: '',
      title: '',
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      allDay: false,
      description: '',
      location: ''
    };
    openEventModal(newEvent);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch patient count
        const patients = await PatientService.getPatients();
        setPatientCount(patients.length);

        // Fetch calendar events from Google Calendar API with error handling
        try {
          const allEvents = await googleCalendarService.getEvents();
          
          // Filter for upcoming events only (events that haven't ended yet)
          const now = new Date();
          const upcoming = allEvents.filter(event => new Date(event.end) > now);
          
          setEventCount(upcoming.length);
          setUpcomingEvents(upcoming.slice(0, 5)); // Show only first 5 upcoming events
        } catch (calendarError) {
          console.error('Calendar fetch error:', calendarError);
          setEventCount(0);
          setUpcomingEvents([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setPatientCount(0);
        setEventCount(0);
      } finally {
        setLoading(false);
        setEventsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <>
      {/* Contenido Principal */}
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sección de Bienvenida */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                ¡Bienvenido de nuevo, {user?.fullName || 'Usuario'}!
              </h2>
              <p className="mt-2 text-gray-600">
                Esto es lo que está pasando con tu cuenta hoy.
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {/* Tarjeta 1 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total de Pacientes</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {loading ? '...' : patientCount}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Citas Totales</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {eventsLoading ? '...' : eventCount}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Tiempo de Respuesta</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">24 min</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleCreateEvent}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Evento
                  </button>
                  <h3 className="text-lg leading-6 font-semibold text-white">Actividad Reciente</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-sm text-gray-300">
                    <svg className="w-4 h-4 mr-1 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Próximos eventos
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-900 text-blue-200">
                    {upcomingEvents.length} eventos
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {eventsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-500">Cargando eventos...</p>
                </div>
              ) : (
                <>
                  {upcomingEvents.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingEvents.map((event, index) => (
                        <div key={event.id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 hover:border-blue-300 cursor-pointer" onClick={() => handleEventClick(event)}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">
                                  {event.summary || 'Evento programado'}
                                </h4>
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                                  Próximo
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7h-1z" />
                                  </svg>
                                  <span className="font-medium">Paciente:</span>
                                  <span className="text-gray-900">{event.title || 'Evento programado'}</span>
                                </div>
                                
                                <div className="flex items-center text-sm text-gray-600">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                  <span className="font-medium">Inicio:</span>
                                  <span className="text-gray-900">
                                    {new Date(event.start).toLocaleDateString('es-ES', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                
                                <div className="flex items-center text-sm text-gray-600">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                  <span className="font-medium">Fin:</span>
                                  <span className="text-gray-900">
                                    {new Date(event.end).toLocaleDateString('es-ES', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                
                                <div className="flex items-center text-sm">
                                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    new Date(event.start) <= new Date() && new Date(event.end) > new Date()
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {new Date(event.start) <= new Date() && new Date(event.end) > new Date()
                                      ? 'En curso'
                                      : formatEventTime(event.start)
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4 flex-shrink-0">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No hay eventos próximos</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        No tienes eventos programados para los próximos días.
                      </p>
                      <div className="mt-6">
                        <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Programar Evento
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Event Modal */}
      {isEventModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={closeEventModal}
          onSave={async (eventData) => {
            // TODO: Implement save functionality
            console.log('Saving event:', eventData);
          }}
          onDelete={async (eventId) => {
            // TODO: Implement delete functionality
            console.log('Deleting event:', eventId);
          }}
        />
      )}
    </>
  );
}