'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEventWithPatient, CalendarView } from '../../types/calendar';
import { CalendarTaskWithPatient } from '../../types/calendarTasks';
import { CalendarService } from '../../services/calendarService';
import { CalendarTaskService } from '../../services/calendarTaskService';
import EventModal from './EventModal';
import { TaskModal } from './TaskModal';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import calendarRealtimeService, { CalendarRealtimeNotification } from '../../services/calendarRealtimeService';
import { SimpleTimezoneFix } from '../../services/simpleTimezoneFix';

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
  const [notifications, setNotifications] = useState<CalendarRealtimeNotification[]>([]);

  // Helper function to format date for display with timezone fix
  const formatEventDate = (dateString: string): Date => {
    try {
      const utcDate = new Date(dateString);
      // Convert UTC to local time using timezone fix
      return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
    } catch (error) {
      console.error('Error formatting event date:', error);
      return new Date(dateString);
    }
  };

  useEffect(() => {
    loadEvents();
    loadTasks();
  }, [currentDate, view]);

  // Real-time updates and notifications
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to real-time notifications
    const unsubscribeNotifications = calendarRealtimeService.onNotification((notification: CalendarRealtimeNotification) => {
      // Show notification for all relevant users (not just current user)
      // The realtime service already handles filtering relevant users
      
      // Add notification to state
      setNotifications(prev => [...prev.slice(-4), notification]); // Keep max 5 notifications
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        const notificationOptions: NotificationOptions = {
          body: notification.message,
          icon: '/Logo.svg', // Use proper logo
          badge: '/Logo.svg', // Use proper logo for badge
          tag: notification.type,
          requireInteraction: true, // Require interaction for calendar notifications
          silent: false
        };

        // Add timestamp for events/tasks
        if (notification.data.start_date || notification.data.due_date) {
          const eventDate = notification.data.start_date || notification.data.due_date;
          if (eventDate) {
            (notificationOptions as any).timestamp = new Date(eventDate).getTime();
          }
        }

        new Notification(notification.title, notificationOptions);
      }

      // Auto-remove notification after 8 seconds
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 8000);

      // Always reload data to ensure instant updates
      if (notification.type.includes('event')) {
        loadEvents();
      } else if (notification.type.includes('task')) {
        loadTasks();
      }
    });

    // Subscribe to event updates for instant refresh
    const unsubscribeEventUpdates = calendarRealtimeService.onEventUpdate((update) => {
      // Always refresh to ensure instant updates
      if (update.table === 'calendar_events') {
        loadEvents();
      } else if (update.table === 'calendar_tasks') {
        loadTasks();
      }
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeEventUpdates();
    };
  }, [userId]);

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
        endDate.toISOString(),
        userId
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
        endDate.toISOString(),
        userId
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
    setShowEventModal(true);
  };

  const handleEventSave = async (eventType: 'created' | 'updated' = 'created', eventData?: any) => {
    try {
      await loadEvents();
      setSelectedEvent(null);
    } catch (error) {
      console.error('📱 Mobile Calendar - Error in handleEventSave:', error);
    }
  };

  const handleTaskSave = async (taskType: 'created' | 'updated' = 'created', taskData?: any) => {
    try {
      await loadTasks();
      setSelectedTask(null);
    } catch (error) {
      console.error('📱 Mobile Calendar - Error in handleTaskSave:', error);
    }
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
      const eventStart = formatEventDate(event.start_date);
      const eventEnd = formatEventDate(event.end_date);
      return isSameDay(date, eventStart) || isSameDay(date, eventEnd) || 
             (date > eventStart && date < eventEnd);
    });
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDue = formatEventDate(task.due_date);
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
                {/* Show events first */}
                {dayEvents.slice(0, 2).map((event, eventIndex) => (
                  <div
                    key={`event-${eventIndex}`}
                    className={`text-xs p-1 rounded text-white truncate ${getEventTypeColor(event.event_type)} border-l-2 ${getPriorityColor(event.priority)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    title={event.title}
                  >
                    {format(formatEventDate(event.start_date), 'h:mm a')} {event.title}
                  </div>
                ))}
                {/* Show tasks */}
                {dayTasks.slice(0, 2).map((task, taskIndex) => (
                  <div
                    key={`task-${taskIndex}`}
                    className={`text-xs p-1 rounded text-white truncate ${getTaskCategoryColor(task.category)} border-l-2 ${getPriorityColor(task.priority)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task);
                    }}
                    title={task.title}
                  >
                    {task.status === 'completed' ? '✓ ' : ''}{task.title}
                  </div>
                ))}
                {/* Show more indicator if needed */}
                {(dayEvents.length + dayTasks.length) > 4 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{dayEvents.length + dayTasks.length - 4} más
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
                {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
              </div>
              {days.map((date, dayIndex) => {
                const dayEvents = getEventsForDate(date).filter(event => {
                  const eventHour = formatEventDate(event.start_date).getHours();
                  return eventHour === hour;
                });
                const dayTasks = getTasksForDate(date).filter(task => {
                  if (!task.due_date) return false;
                  const taskHour = new Date(task.due_date).getHours();
                  return taskHour === hour;
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
                        key={`event-${eventIndex}`}
                        className={`text-xs p-1 rounded text-white mb-1 ${getEventTypeColor(event.event_type)} border-l-2 ${getPriorityColor(event.priority)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayTasks.map((task, taskIndex) => (
                      <div
                        key={`task-${taskIndex}`}
                        className={`text-xs p-1 rounded text-white mb-1 ${getTaskCategoryColor(task.category)} border-l-2 ${getPriorityColor(task.priority)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                      >
                        {task.status === 'completed' ? '✓ ' : ''}{task.title}
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
    const dayTasks = getTasksForDate(currentDate);
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
              const eventHour = formatEventDate(event.start_date).getHours();
              return eventHour === hour;
            });
            const hourTasks = dayTasks.filter(task => {
              if (!task.due_date) return false;
              const taskHour = new Date(task.due_date).getHours();
              return taskHour === hour;
            });

            return (
              <div key={hour} className="flex">
                <div className="w-20 p-2 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                </div>
                <div className="flex-1 p-2 min-h-[60px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => {
                    const clickDate = new Date(currentDate);
                    clickDate.setHours(hour, 0, 0, 0);
                    handleDateClick(clickDate);
                  }}>
                  {hourEvents.map((event, index) => (
                    <div
                      key={`event-${index}`}
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
                        {format(formatEventDate(event.start_date), 'h:mm a')} - {format(formatEventDate(event.end_date), 'h:mm a')}
                      </div>
                    </div>
                  ))}
                  {hourTasks.map((task, index) => (
                    <div
                      key={`task-${index}`}
                      className={`text-sm p-2 rounded text-white mb-2 ${getTaskCategoryColor(task.category)} border-l-4 ${getPriorityColor(task.priority)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task);
                      }}
                    >
                      <div className="font-medium">{task.status === 'completed' ? '✓ ' : ''}{task.title}</div>
                      {task.patient && (
                        <div className="text-xs opacity-90">
                          {task.patient.nombre_completo}
                        </div>
                      )}
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
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
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
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setSelectedDate(new Date());
                  setShowEventModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Nuevo Evento</span>
              </button>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setSelectedDate(new Date());
                  setShowTaskModal(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Nueva Tarea</span>
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
        onSave={async (event) => {
          const eventType = selectedEvent ? 'updated' : 'created';
          await handleEventSave(eventType, event);
        }}
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
        onSave={async (task) => {
          const taskType = selectedTask ? 'updated' : 'created';
          await handleTaskSave(taskType, task);
        }}
        userId={userId}
      />

      {/* Real-time Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={`${notification.timestamp}-${index}`}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse max-w-sm"
            role="alert"
          >
            <div className="font-semibold text-sm">{notification.title}</div>
            <div className="text-xs opacity-90">{notification.message}</div>
          </div>
        ))}
      </div>
    </>
  );
};
