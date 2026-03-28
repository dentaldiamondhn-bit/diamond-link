'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarView, CalendarEventWithPatient } from '../../types/calendar';
import { CalendarTaskWithPatient } from '../../types/calendarTasks';
import calendarRealtimeService, { CalendarRealtimeNotification } from '../../services/calendarRealtimeService';
import { CalendarService } from '../../services/calendarService';
import { CalendarTaskService } from '../../services/calendarTaskService';
import { CapacitorNotificationService } from '../../services/capacitorNotificationService';
import { useBellNotifications } from '../../contexts/BellNotificationContext';
import { EventModal } from './EventModal';
import { TaskModal } from './TaskModal';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
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
  
  // Bell notification hook for Android tray notifications
  const { addNotification: addBellNotification } = useBellNotifications();

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
    const unsubscribeNotifications = calendarRealtimeService.onNotification(async (notification: CalendarRealtimeNotification) => {
      console.log('🔔 CALENDAR NOTIFICATION RECEIVED:', {
        notification,
        currentUserId: userId,
        notificationUserId: notification.userId,
        shouldShow: notification.userId === userId
      });
      
      // Show notification for ALL users (remove filtering to debug)
      // Add notification to state
      setNotifications(prev => [...prev.slice(-4), notification]); // Keep max 5 notifications
      
      // Show browser notification with better permission handling
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

        // Create browser notification
        try {
          const browserNotification = new Notification(notification.title, notificationOptions);
          
          // Auto-close notification after 8 seconds
          setTimeout(() => {
            browserNotification.close();
          }, 8000);
          
          console.log('✅ Browser notification created for invitee:', {
            title: notification.title,
            body: notification.message,
            userId: notification.userId
          });
        } catch (error) {
          console.error('❌ Error creating browser notification:', error);
        }

        // Also trigger Capacitor notification for mobile devices (non-blocking)
        try {
          const capacitorService = CapacitorNotificationService.getInstance();
          capacitorService.sendLocalNotification({
            id: `calendar-${notification.type}-${Date.now()}`,
            title: notification.title,
            body: notification.message,
            icon: '/Logo.svg',
            tag: notification.type,
            data: {
              type: notification.type,
              userId: notification.userId,
              eventId: notification.data.item_id,
              timestamp: notification.timestamp
            }
          }).catch(error => {
            console.error('❌ Error creating Capacitor notification:', error);
          });
          console.log('📱 Capacitor notification sent for invitee:', {
            title: notification.title,
            body: notification.message,
            userId: notification.userId
          });
        } catch (error) {
          console.error('❌ Error creating Capacitor notification:', error);
        }

        // Also add to Bell notification system for Android tray notifications
        try {
          await addBellNotification({
            type: 'calendar_event',
            title: notification.title,
            message: notification.message,
            metadata: {
              userId: notification.userId,
              eventId: notification.data.item_id,
              eventTitle: notification.data.title || notification.title,
              eventTime: notification.data.start_date ? new Date(notification.data.start_date) : undefined
            }
          });
          console.log('🔔 Bell notification added for invitee:', {
            title: notification.title,
            userId: notification.userId
          });
        } catch (error) {
          console.error('❌ Error adding Bell notification:', error);
        }
      } else if (Notification.permission === 'default') {
        // Request permission if not yet granted
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('🔔 Notification permission granted for invitee notifications');
            // Retry notification creation
            setTimeout(() => {
              const retryOptions: NotificationOptions = {
                body: notification.message,
                icon: '/Logo.svg',
                badge: '/Logo.svg',
                tag: notification.type,
                requireInteraction: true,
                silent: false
              };
              new Notification(notification.title, retryOptions);
            }, 500);
          }
        });
      } else {
        console.warn('⚠️ Notification permission denied for invitee notifications');
      }

      // Auto-remove notification after 8 seconds
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 8000);

      // Always reload data to ensure instant updates
      if (notification.type.includes('event')) {
        console.log('🔄 Refreshing events due to event notification:', notification.type);
        loadEvents();
      } else if (notification.type.includes('task')) {
        console.log('🔄 Refreshing tasks due to task notification:', notification.type);
        loadTasks();
      } else if (notification.type === 'invitee_added') {
        console.log('🔄 Refreshing events due to invitee notification');
        loadEvents(); // Refresh events when invitee is added
        // Also force a more aggressive refresh after a short delay
        setTimeout(() => {
          console.log('🔄 Force refreshing events again for invitee');
          loadEvents();
        }, 1000);
      }
    });

    // Subscribe to event updates for instant refresh
    const unsubscribeEventUpdates = calendarRealtimeService.onEventUpdate((update) => {
      // Always refresh to ensure instant updates
      console.log('📅 Calendar event update received:', {
        table: update.table,
        type: update.type,
        recordId: update.record?.id,
        userId: userId
      });
      
      if (update.table === 'calendar_events') {
        // Refresh events for any calendar_events update
        console.log('🔄 Refreshing events due to calendar_events update');
        loadEvents();
      } else if (update.table === 'calendar_tasks') {
        // Refresh tasks for any calendar_tasks update
        console.log('🔄 Refreshing tasks due to calendar_tasks update');
        loadTasks();
      }
      
      // Also refresh if this might be an invitee-related update
      if (update.record?.id && (update.type === 'UPDATE' || update.type === 'INSERT')) {
        console.log('🔄 Potential invitee update, refreshing events');
        loadEvents();
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

  const handleEventSave = (eventType: 'created' | 'updated' = 'created', eventData?: any) => {
    loadEvents();
    setSelectedEvent(null);
  };

  const handleTaskSave = (taskType: 'created' | 'updated' = 'created', taskData?: any) => {
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
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'consultation':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
      case 'surgery':
        return 'bg-gradient-to-r from-rose-500 to-rose-600';
      case 'follow_up':
        return 'bg-gradient-to-r from-amber-500 to-amber-600';
      case 'reminder':
        return 'bg-gradient-to-r from-violet-500 to-violet-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const getTaskCategoryColor = (category: string) => {
    switch (category) {
      case 'admin':
        return 'bg-gradient-to-r from-indigo-500 to-indigo-600';
      case 'clinical':
        return 'bg-gradient-to-r from-teal-500 to-teal-600';
      case 'follow_up':
        return 'bg-gradient-to-r from-orange-500 to-orange-600';
      case 'documentation':
        return 'bg-gradient-to-r from-pink-500 to-pink-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-500';
      case 'medium':
        return 'border-l-4 border-amber-500';
      case 'low':
        return 'border-l-4 border-emerald-500';
      default:
        return 'border-l-4 border-gray-500';
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
      <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-700 rounded-tl-lg rounded-tr-lg overflow-hidden">
        {/* Header */}
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div key={day} className="bg-gradient-to-b from-slate-700 to-slate-800 p-3 text-center text-sm font-semibold text-white shadow-sm">
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
              className={`bg-white dark:bg-gray-900 p-2 min-h-[120px] cursor-pointer hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all duration-200 ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
              } ${isToday ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <div className={`text-sm font-bold mb-2 ${isToday ? 'bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''} ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                {format(date, 'd')}
              </div>
              <div className="space-y-1.5">
                {/* Show events first */}
                {dayEvents.slice(0, 2).map((event, eventIndex) => (
                  <div
                    key={`event-${eventIndex}`}
                    className={`text-xs px-2 py-1.5 rounded-md text-white truncate shadow-sm hover:shadow-md transition-shadow cursor-pointer ${getEventTypeColor(event.event_type)} ${getPriorityColor(event.priority)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    title={event.title}
                  >
                    <span className="font-medium">{format(formatEventDate(event.start_date), 'h:mm a')}</span> {event.title}
                  </div>
                ))}
                {/* Show tasks */}
                {dayTasks.slice(0, 2).map((task, taskIndex) => (
                  <div
                    key={`task-${taskIndex}`}
                    className={`text-xs px-2 py-1.5 rounded-md text-white truncate shadow-sm hover:shadow-md transition-shadow cursor-pointer ${getTaskCategoryColor(task.category)} ${getPriorityColor(task.priority)}`}
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
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 rounded px-2 py-1 text-center">
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
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-8 bg-gradient-to-r from-slate-700 to-slate-800 border-b border-gray-200 dark:border-gray-700">
          <div className="p-3 text-sm font-semibold text-white/80">Hora</div>
          {days.map((date, index) => (
            <div key={index} className="p-3 text-center text-white border-l border-white/10">
              <div className="text-xs font-medium uppercase tracking-wide opacity-80">{format(date, 'EEE', { locale: es })}</div>
              <div className={`text-xl font-bold mt-1 ${isSameDay(date, new Date()) ? 'bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                {format(date, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800 font-medium">
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
                    className="p-1 border-l border-gray-100 dark:border-gray-800 min-h-[60px] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    onClick={() => {
                      const clickDate = new Date(date);
                      clickDate.setHours(hour, 0, 0, 0);
                      handleDateClick(clickDate);
                    }}
                  >
                    {dayEvents.map((event, eventIndex) => (
                      <div
                        key={`event-${eventIndex}`}
                        className={`text-xs px-2 py-1.5 rounded-md text-white mb-1 shadow-sm cursor-pointer hover:shadow-md transition-all ${getEventTypeColor(event.event_type)} ${getPriorityColor(event.priority)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        <span className="font-semibold">{event.title}</span>
                      </div>
                    ))}
                    {dayTasks.map((task, taskIndex) => (
                      <div
                        key={`task-${taskIndex}`}
                        className={`text-xs px-2 py-1.5 rounded-md text-white mb-1 shadow-sm cursor-pointer hover:shadow-md transition-all ${getTaskCategoryColor(task.category)} ${getPriorityColor(task.priority)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                      >
                        <span className="font-semibold">{task.status === 'completed' ? '✓ ' : ''}{task.title}</span>
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
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-slate-700 to-slate-800">
          <h3 className="text-xl font-bold text-white">
            {format(currentDate, 'EEEE, d MMMM yyyy', { locale: es }).charAt(0).toUpperCase() + format(currentDate, 'EEEE, d MMMM yyyy', { locale: es }).slice(1)}
          </h3>
          <p className="text-white/60 text-sm mt-1">{dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''} • {dayTasks.length} tarea{dayTasks.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Time slots */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
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
              <div key={hour} className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-24 p-3 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800 font-medium">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                </div>
                <div className="flex-1 p-3 min-h-[80px] cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  onClick={() => {
                    const clickDate = new Date(currentDate);
                    clickDate.setHours(hour, 0, 0, 0);
                    handleDateClick(clickDate);
                  }}>
                  {hourEvents.map((event, index) => (
                    <div
                      key={`event-${index}`}
                      className={`text-sm p-3 rounded-lg text-white mb-3 shadow-md cursor-pointer hover:shadow-lg transition-all ${getEventTypeColor(event.event_type)} ${getPriorityColor(event.priority)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <div className="font-bold">{event.title}</div>
                      {event.patient && (
                        <div className="text-xs opacity-90 mt-1 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
                          {event.patient.nombre_completo}
                        </div>
                      )}
                      <div className="text-xs opacity-75 mt-1 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {format(formatEventDate(event.start_date), 'h:mm a')} - {format(formatEventDate(event.end_date), 'h:mm a')}
                      </div>
                    </div>
                  ))}
                  {hourTasks.map((task, index) => (
                    <div
                      key={`task-${index}`}
                      className={`text-sm p-3 rounded-lg text-white mb-3 shadow-md cursor-pointer hover:shadow-lg transition-all ${getTaskCategoryColor(task.category)} ${getPriorityColor(task.priority)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task);
                      }}
                    >
                      <div className="font-bold flex items-center">
                        {task.status === 'completed' && (
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {task.title}
                      </div>
                      {task.patient && (
                        <div className="text-xs opacity-90 mt-1 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
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
      <div className="space-y-4">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 rounded-xl shadow-lg p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">
                  {format(currentDate, 'MMMM yyyy', { locale: es }).charAt(0).toUpperCase() + format(currentDate, 'MMMM yyyy', { locale: es }).slice(1)}
                </h2>
                <p className="text-white/60 text-sm">{format(currentDate, 'yyyy')}</p>
              </div>
              
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 text-white/80 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentDate(new Date())}
                className="ml-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex bg-white/10 backdrop-blur rounded-lg p-1">
                {(['month', 'week', 'day'] as const).map(viewType => (
                  <button
                    key={viewType}
                    onClick={() => setView(viewType)}
                    className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                      view === viewType
                        ? 'bg-white text-slate-800 shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {viewType === 'month' ? 'Mes' : viewType === 'week' ? 'Semana' : 'Día'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setSelectedDate(new Date());
                  setShowEventModal(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 font-medium"
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
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2 font-medium"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
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
        onSave={(event) => {
          const eventType = selectedEvent ? 'updated' : 'created';
          handleEventSave(eventType, event);
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
        onSave={(task) => {
          const taskType = selectedTask ? 'updated' : 'created';
          handleTaskSave(taskType, task);
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
