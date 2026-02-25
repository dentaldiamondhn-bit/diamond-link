'use client';

import React, { useState, useEffect } from 'react';
import { CalendarEventWithPatient, CalendarView } from '../../types/calendar';
import { CalendarTaskWithPatient } from '../../types/calendarTasks';
import { CalendarService } from '../../services/calendarService';
import { CalendarTaskService } from '../../services/calendarTaskService';
import { EventModal } from './EventModal';
import { TaskModal } from './TaskModal';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarProps {
  userId: string;
  userRole?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ userId, userRole }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView['type']>('month');
  const [events, setEvents] = useState<CalendarEventWithPatient[]>([]);
  const [tasks, setTasks] = useState<CalendarTaskWithPatient[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithPatient | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTaskWithPatient | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTasks, setShowTasks] = useState(false); // Toggle between events and tasks

  useEffect(() => {
    if (showTasks) {
      loadTasks();
    } else {
      loadEvents();
    }
  }, [currentDate, view, showTasks]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      switch (view) {
        case 'month':
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
          break;
        case 'week':
          startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
          endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
          break;
        case 'day':
          startDate = new Date(currentDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
      }

      const eventsData = await CalendarService.getEventsByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      switch (view) {
        case 'month':
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
          break;
        case 'week':
          startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
          endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
          break;
        case 'day':
          startDate = new Date(currentDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(currentDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
      }

      const tasksData = await CalendarTaskService.getTasksByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: CalendarEventWithPatient) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleTaskClick = (task: CalendarTaskWithPatient) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setSelectedTask(null);
    if (showTasks) {
      setShowTaskModal(true);
    } else {
      setShowEventModal(true);
    }
  };

  const handleEventSave = () => {
    loadEvents();
    setSelectedEvent(null);
  };

  const handleTaskSave = () => {
    loadTasks();
    setSelectedTask(null);
  };

  const navigatePrevious = () => {
    switch (view) {
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, -7));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, 7));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = parseISO(event.end_date);
      return isSameDay(date, eventStart) || isSameDay(date, eventEnd) || 
             (date > eventStart && date < eventEnd);
    });
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDue = parseISO(task.due_date);
      return isSameDay(date, taskDue);
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'appointment':
        return 'bg-blue-500';
      case 'consultation':
        return 'bg-green-500';
      case 'surgery':
        return 'bg-red-500';
      case 'follow_up':
        return 'bg-yellow-500';
      case 'reminder':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTaskCategoryColor = (category: string) => {
    switch (category) {
      case 'admin':
        return 'bg-indigo-500';
      case 'clinical':
        return 'bg-teal-500';
      case 'follow_up':
        return 'bg-orange-500';
      case 'documentation':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500';
      case 'medium':
        return 'border-yellow-500';
      case 'low':
        return 'border-green-500';
      default:
        return 'border-gray-500';
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {/* Header */}
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {day}
          </div>
        ))}
        
        {/* Days */}
        {days.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const dayTasks = getTasksForDate(date);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isToday = isSameDay(date, new Date());

          return (
            <div
              key={index}
              className={`bg-white dark:bg-gray-900 p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                !isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : ''
              } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <div className="text-sm font-medium mb-1">
                {format(date, 'd')}
              </div>
              <div className="space-y-1">
                {showTasks ? (
                  // Show tasks
                  dayTasks.slice(0, 3).map((task, taskIndex) => (
                    <div
                      key={taskIndex}
                      className={`text-xs p-1 rounded text-white truncate ${getTaskCategoryColor(task.category)} border-l-2 ${getPriorityColor(task.priority)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task);
                      }}
                      title={task.title}
                    >
                      {task.status === 'completed' ? '✓ ' : ''}{task.title}
                    </div>
                  ))
                ) : (
                  // Show events
                  dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={`text-xs p-1 rounded text-white truncate ${getEventTypeColor(event.event_type)} border-l-2 ${getPriorityColor(event.priority)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      title={event.title}
                    >
                      {format(parseISO(event.start_date), 'HH:mm')} {event.title}
                    </div>
                  ))
                )}
                {(showTasks ? dayTasks.length > 3 : dayEvents.length > 3) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{(showTasks ? dayTasks.length : dayEvents.length) - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }

    const hours = [];
    for (let hour = 0; hour < 24; hour++) {
      hours.push(hour);
    }

    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 text-sm font-medium text-gray-700 dark:text-gray-300">Hora</div>
          {days.map((date, index) => (
            <div key={index} className="p-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700">
              <div>{format(date, 'EEE', { locale: es })}</div>
              <div className={isSameDay(date, new Date()) ? 'text-blue-600 dark:text-blue-400' : ''}>
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8">
              <div className="p-2 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
              </div>
              {days.map((date, dayIndex) => {
                const dayEvents = getEventsForDate(date).filter(event => {
                  const eventHour = parseISO(event.start_date).getHours();
                  return eventHour === hour;
                });

                return (
                  <div
                    key={dayIndex}
                    className="p-1 border-l border-gray-200 dark:border-gray-700 min-h-[60px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => {
                      const clickDate = new Date(date);
                      clickDate.setHours(hour, 0, 0, 0);
                      handleDateClick(clickDate);
                    }}
                  >
                    {dayEvents.map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={`text-xs p-1 rounded text-white mb-1 ${getEventTypeColor(event.event_type)} border-l-2 ${getPriorityColor(event.priority)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = [];
    for (let hour = 0; hour < 24; hour++) {
      hours.push(hour);
    }

    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}
          </h3>
        </div>

        {/* Time slots */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = parseISO(event.start_date).getHours();
              return eventHour === hour;
            });

            return (
              <div key={hour} className="flex">
                <div className="w-20 p-2 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                  {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                </div>
                <div className="flex-1 p-2 min-h-[60px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => {
                    const clickDate = new Date(currentDate);
                    clickDate.setHours(hour, 0, 0, 0);
                    handleDateClick(clickDate);
                  }}>
                  {hourEvents.map((event, index) => (
                    <div
                      key={index}
                      className={`text-sm p-2 rounded text-white mb-2 ${getEventTypeColor(event.event_type)} border-l-4 ${getPriorityColor(event.priority)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <div className="font-medium">{event.title}</div>
                      {event.patient && (
                        <div className="text-xs opacity-90">
                          {event.patient.nombre_completo}
                        </div>
                      )}
                      <div className="text-xs opacity-75">
                        {format(parseISO(event.start_date), 'HH:mm')} - {format(parseISO(event.end_date), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={navigatePrevious}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
            >
              Hoy
            </button>
            
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md">
              {(['month', 'week', 'day'] as const).map(viewType => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    view === viewType
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {viewType === 'month' ? 'Mes' : viewType === 'week' ? 'Semana' : 'Día'}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md">
              <button
                onClick={() => setShowTasks(false)}
                className={`px-3 py-1 text-sm rounded-md ${
                  !showTasks
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Eventos
              </button>
              <button
                onClick={() => setShowTasks(true)}
                className={`px-3 py-1 text-sm rounded-md ${
                  showTasks
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Tareas
              </button>
            </div>

            <button
              onClick={() => {
                if (showTasks) {
                  setSelectedTask(null);
                  setSelectedDate(new Date());
                  setShowTaskModal(true);
                } else {
                  setSelectedEvent(null);
                  setSelectedDate(new Date());
                  setShowEventModal(true);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuevo {showTasks ? 'Tarea' : 'Evento'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        event={selectedEvent}
        onSave={handleEventSave}
        userId={userId}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
          setSelectedDate(null);
        }}
        task={selectedTask}
        onSave={handleTaskSave}
        userId={userId}
      />
    </div>
  );
};
