'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus, Bell, Settings, Clock, User, MapPin, Filter, Search } from 'lucide-react';

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  location?: string;
  event_type: 'appointment' | 'consultation' | 'surgery' | 'follow_up' | 'reminder' | 'other';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high';
  patient_id?: string;
  patient?: {
    paciente_id: string;
    nombre_completo: string;
    telefono?: string;
    email?: string;
  };
  notes?: string;
  reminder_minutes?: number;
}

interface CalendarTask {
  id?: string;
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  patient_id?: string;
  patient?: {
    paciente_id: string;
    nombre_completo: string;
    telefono?: string;
    email?: string;
  };
  created_by: string;
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

interface PwaCalendarWidgetProps {
  events?: CalendarEvent[];
  tasks?: CalendarTask[];
  onEventClick?: (event: CalendarEvent) => void;
  onTaskClick?: (task: CalendarTask) => void;
  onAddEvent?: (date: Date) => void;
  onAddTask?: (date: Date) => void;
}

export const PwaCalendarWidget: React.FC<PwaCalendarWidgetProps> = ({
  events = [],
  tasks = [],
  onEventClick,
  onTaskClick,
  onAddEvent,
  onAddTask
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      const result = await installPrompt.prompt();
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_date), day));
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.due_date), day));
  };

  const getFilteredEvents = () => {
    let filtered = events;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.event_type === filterType);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.patient?.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.patient?.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'appointment': return 'bg-blue-500';
      case 'consultation': return 'bg-green-500';
      case 'surgery': return 'bg-red-500';
      case 'follow_up': return 'bg-yellow-500';
      case 'reminder': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 border-red-200';
      case 'medium': return 'text-yellow-600 border-yellow-200';
      case 'low': return 'text-green-600 border-green-200';
      default: return 'text-gray-600 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {monthDays.map(day => {
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              onClick={() => setSelectedDate(day)}
              className={`
                relative p-2 rounded-lg border-2 cursor-pointer transition-all min-h-[80px]
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                ${isToday ? 'bg-yellow-50 border-yellow-300' : 'bg-white'}
              `}
            >
              <div className="text-sm font-medium text-gray-900">
                {format(day, 'd')}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event, index) => (
                  <div
                    key={`event-${index}`}
                    className={`w-2 h-2 ${getEventColor(event.event_type)} rounded-full`}
                    title={event.title}
                  />
                ))}
                {dayTasks.slice(0, 1).map((task, index) => (
                  <div
                    key={`task-${index}`}
                    className="w-2 h-2 bg-orange-500 rounded-full"
                    title={task.title}
                  />
                ))}
                {(dayEvents.length + dayTasks.length) > 3 && (
                  <div className="text-xs text-gray-500">+{(dayEvents.length + dayTasks.length) - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              onClick={() => setSelectedDate(day)}
              className={`
                p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[120px]
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                ${isToday ? 'bg-yellow-50 border-yellow-300' : 'bg-white'}
              `}
            >
              <div className="text-sm font-medium text-gray-900 mb-2">
                {format(day, 'EEE d')}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, index) => (
                  <div
                    key={`event-${index}`}
                    className={`text-xs p-1 rounded ${getEventColor(event.event_type)} text-white truncate`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayTasks.slice(0, 2).map((task, index) => (
                  <div
                    key={`task-${index}`}
                    className="text-xs p-1 bg-orange-500 text-white rounded truncate"
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(selectedDate);
    const dayTasks = getTasksForDay(selectedDate);

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-4">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          
          {dayEvents.length === 0 && dayTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No events or tasks scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((event, index) => (
                <div
                  key={`event-${index}`}
                  onClick={() => onEventClick?.(event)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.patient && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{event.patient.nombre_completo}</span>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-2">{event.description}</p>
                  )}
                </div>
              ))}
              
              {dayTasks.map((task, index) => (
                <div
                  key={`task-${index}`}
                  onClick={() => onTaskClick?.(task)}
                  className="p-3 border border-orange-200 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${task.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {task.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(task.due_date), 'HH:mm')}</span>
                    </div>
                    {task.patient && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{task.patient.nombre_completo}</span>
                      </div>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-2">{task.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const allEvents = getFilteredEvents();
    const allTasks = getFilteredTasks();
    
    // Sort by date
    const sortedItems = [...allEvents, ...allTasks].sort((a, b) => {
      const dateA = new Date('start_date' in a ? a.start_date : a.due_date);
      const dateB = new Date('start_date' in b ? b.start_date : b.due_date);
      return dateA.getTime() - dateB.getTime();
    });

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Agenda View</h3>
          
          {sortedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No upcoming events or tasks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item, index) => {
                const isEvent = 'start_date' in item;
                const date = new Date(isEvent ? (item as CalendarEvent).start_date : (item as CalendarTask).due_date);
                
                return (
                  <div
                    key={`${isEvent ? 'event' : 'task'}-${index}`}
                    onClick={() => isEvent ? onEventClick?.(item as CalendarEvent) : onTaskClick?.(item as CalendarTask)}
                    className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      isEvent ? 'border-gray-200' : 'border-orange-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600">
                          {format(date, 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isEvent && (
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor((item as CalendarEvent).status)}`}>
                            {(item as CalendarEvent).status}
                          </span>
                        )}
                        {!isEvent && (
                          <span className={`px-2 py-1 text-xs rounded-full ${(item as CalendarTask).completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {(item as CalendarTask).completed ? 'Completed' : 'Pending'}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.patient && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{item.patient.nombre_completo}</span>
                      </div>
                    )}
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-2">{item.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Diamond Link Calendar</h1>
            </div>
            <div className="flex items-center space-x-2">
              {!isInstalled && installPrompt && (
                <button
                  onClick={handleInstall}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Install App</span>
                </button>
              )}
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {showNotifications && (
                  <div className="absolute top-12 right-0 bg-white rounded-lg shadow-lg p-4 w-80">
                    <h3 className="font-semibold mb-2">Notifications</h3>
                    <p className="text-sm text-gray-600">No new notifications</p>
                  </div>
                )}
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events, tasks, or patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="appointment">Appointments</option>
                <option value="consultation">Consultations</option>
                <option value="surgery">Surgeries</option>
                <option value="follow_up">Follow-ups</option>
                <option value="reminder">Reminders</option>
              </select>
            </div>
          </div>

          {/* View Navigation */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              {(['month', 'week', 'day', 'agenda'] as const).map(viewType => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    view === viewType
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } transition-colors`}
                >
                  {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          {view === 'month' && (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>
              {renderMonthView()}
            </div>
          )}
          
          {view === 'week' && (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>
              {renderWeekView()}
            </div>
          )}
          
          {view === 'day' && renderDayView()}
          
          {view === 'agenda' && renderAgendaView()}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => onAddEvent?.(selectedDate)}
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center"
            >
              <Plus className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Add Event</span>
            </button>
            <button
              onClick={() => onAddTask?.(selectedDate)}
              className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center"
            >
              <Plus className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Add Task</span>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center">
              <Bell className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Set Reminder</span>
            </button>
            <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
              <Settings className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Settings</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getFilteredEvents().length}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{getFilteredTasks().length}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {getFilteredEvents().filter(e => e.status === 'confirmed').length}
              </div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {getFilteredTasks().filter(t => !t.completed).length}
              </div>
              <div className="text-sm text-gray-600">Pending Tasks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PwaCalendarWidget;
