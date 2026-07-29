'use client';

import { useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import type { ClinicEvent } from '@/lib/types-calendar';

interface Participant {
  id: string;
  role: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_image_url?: string | null;
}

interface Props {
  events: ClinicEvent[];
  onAddEvent: () => void;
  onEditEvent: (event: ClinicEvent) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'No especificada';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-HN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-HN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export default function UpcomingEvents({ events, onAddEvent, onEditEvent }: Props) {
  const [upcomingEvents, setUpcomingEvents] = useState<ClinicEvent[]>([]);
  const [participantsMap, setParticipantsMap] = useState<Record<number, Participant[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        const endDate = twoWeeksFromNow.toISOString().slice(0, 10);

        const upcoming = events
          .filter((e) => {
            if (!e.date) return false;
            return e.date >= today && e.date <= endDate && e.status !== 'cancelled';
          })
          .sort((a, b) => {
            if (!a.date || !b.date) return 0;
            const aTime = a.start_time || '00:00';
            const bTime = b.start_time || '00:00';
            return a.date.localeCompare(b.date) || aTime.localeCompare(bTime);
          });

        setUpcomingEvents(upcoming);

    const pMap: Record<number, Participant[]> = {};
    await Promise.all(
      upcoming.map(async (event) => {
        try {
          const res = await fetch(`/api/events/${event.id}/participants`, {
            headers: { 'x-user-id': event.user_id },
          });
          if (res.ok) {
            const data = await res.json();
            pMap[event.id] = data;
            if (process.env.NODE_ENV === 'development') {
              console.debug('[UpcomingEvents] participants for', event.id, data);
            }
          } else {
            pMap[event.id] = [];
          }
        } catch {
          pMap[event.id] = [];
        }
      })
    );

        setParticipantsMap(pMap);
      } catch (err) {
        console.error('Error fetching upcoming events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, [events]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'scheduled':
        return 'Programado';
      case 'cancelled':
        return 'Cancelado';
      case 'completed':
        return 'Completado';
      default:
        return status || 'Pendiente';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Próximos Eventos
        </h3>
        <button
          onClick={() => window.location.href = '/calendario'}
          className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 text-sm font-medium"
        >
          Ver Calendario →
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-teal-600 mr-2" size={24} />
          <span className="text-gray-600 dark:text-gray-400">Cargando eventos...</span>
        </div>
      ) : upcomingEvents.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <CalendarIcon size={48} className="mx-auto" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay eventos próximos
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No tienes eventos programados para hoy o mañana.
          </p>
          <button
            onClick={onAddEvent}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors duration-200"
          >
            <Plus size={18} className="mr-2" />
            Crear Evento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingEvents.map((event) => {
            const eventParticipants = participantsMap[event.id] || [];
            const displayParticipants = eventParticipants.slice(0, 4);

            return (
              <div
                key={event.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                onClick={() => onEditEvent(event)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                      event.status
                    )}`}
                  >
                    {getStatusText(event.status)}
                  </span>

                  {eventParticipants.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400"> Participantes: </span>
                      <div className="flex -space-x-2">
                        {displayParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="relative"
                            title={`${participant.first_name} ${participant.last_name} (${
                              participant.role === 'owner'
                                ? 'Organizador'
                                : participant.role === 'invitee_accepted'
                                ? 'Invitado'
                                : 'Pendiente'
                            })`}
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600">
                              {participant.profile_image_url ? (
                                <img
                                  src={participant.profile_image_url}
                                  alt={`${participant.first_name} ${participant.last_name}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const names = `${participant.first_name} ${participant.last_name}`
                                      .replace(/\s+/g, '+');
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${names}&background=random&size=32`;
                                  }}
                                />
                              ) : (
                                <img
                                  src={`https://ui-avatars.com/api/?name=${participant.first_name}+${participant.last_name}&background=random&size=32`}
                                  alt={`${participant.first_name} ${participant.last_name}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            {participant.role === 'owner' && (
                              <div className="absolute -left-1 -top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                <span className="text-white text-xs">👑</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {eventParticipants.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 border-2 border-white dark:border-gray-800">
                            +{eventParticipants.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {event.title}
                </div>

                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <CalendarIcon size={16} className="mr-2" />
                  {formatDate(event.date)}
                  {event.start_time && (
                    <>
                      {' '}
                      - {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </>
                  )}
                </div>

                {event.patient_name && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="mr-2">👤</span>
                    {event.patient_name}
                  </div>
                )}

                {event.location && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="mr-2">📍</span>
                    {event.location}
                  </div>
                )}

                {event.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {event.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
