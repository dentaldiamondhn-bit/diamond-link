'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Loader2 } from 'lucide-react';
import type { View } from 'react-big-calendar';
import type { ClinicEvent, Task } from '@/lib/types-calendar';
import { eventsToRbc, dateToDateStr } from '@/calendario/rbcAdapter';
import { viewToRange } from '@/calendario/range';
import {
  useCalendarEvents,
  useCalendarTasks,
  useCalendarReminders,
  useCalendarMutations,
} from '@/calendario/hooks/useCalendarData';
import { useCalendarRealtime } from '@/calendario/hooks/useCalendarRealtime';
import CalendarSkeleton from '@/calendario/CalendarSkeleton';
import DayDetail from '@/components/calendar-new/DayDetail';
import TaskPanel from '@/components/calendar-new/TaskPanel';
import ReminderPanel from '@/components/calendar-new/ReminderPanel';
import EventModal from '@/components/calendar-new/EventModal';
import { useToast } from '@/components/calendar-new/Toast';
import type { RbcEvent } from '@/calendario/rbcAdapter';

const RbcCalendar = dynamic(() => import('@/calendario/RbcCalendar'), {
  ssr: false,
  loading: () => <CalendarSkeleton />,
});

const VIEWS: View[] = ['month', 'week', 'work_week', 'day', 'agenda'];

function parseDateStr(s: string | null): Date {
  if (s) {
    const [y, mo, d] = s.split('-').map((n) => parseInt(n, 10));
    if (y && mo && d) return new Date(y, mo - 1, d);
  }
  return new Date();
}

function initialView(): View {
  if (typeof window === 'undefined') return 'month';
  const v = new URLSearchParams(window.location.search).get('view');
  return (VIEWS as string[]).includes(v || '') ? (v as View) : 'month';
}

function initialDateStr(): string {
  if (typeof window === 'undefined') return dateToDateStr(new Date());
  const d = new URLSearchParams(window.location.search).get('date');
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : dateToDateStr(new Date());
}

interface Props {
  userId: string;
}

export default function CalendarShell({ userId }: Props) {
  const { push } = useToast();
  const [view, setView] = useState<View>(initialView);
  const [date, setDate] = useState<Date>(() => parseDateStr(initialDateStr()));
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDateStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClinicEvent | null>(null);

  // The fetch window is derived from view + date (deterministic URL restore),
  // and mirrored into ?from=&to= for deep links / debugging.
  const range = useMemo(() => viewToRange(view, date), [view, date]);

  const eventsQuery = useCalendarEvents(range);
  const tasksQuery = useCalendarTasks();
  const remindersQuery = useCalendarReminders();
  const mutations = useCalendarMutations();
  useCalendarRealtime(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    params.set('date', dateToDateStr(date));
    params.set('from', range.from);
    params.set('to', range.to);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [view, date, range]);

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const tasks = tasksQuery.data ?? [];
  const reminders = remindersQuery.data ?? [];

  const rbcEvents = useMemo(() => eventsToRbc(events), [events]);

  const invalidateForModal = () => {
    eventsQuery.refetch();
    tasksQuery.refetch();
    remindersQuery.refetch();
  };

  const addTask = async (title: string, priority: Task['priority'], due_date: string) => {
    try {
      await mutations.addTask.mutateAsync({ title, priority, due_date });
      push('Task added', 'success');
    } catch {
      push('Failed to add task', 'error');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await mutations.toggleTask.mutateAsync({ id: task.id, completed: !task.completed });
    } catch {
      push('Failed to update task', 'error');
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await mutations.deleteTask.mutateAsync(id);
      push('Task deleted', 'success');
    } catch {
      push('Failed to delete task', 'error');
    }
  };

  const addReminder = async (message: string, remind_at: string) => {
    try {
      await mutations.addReminder.mutateAsync({ message, remind_at });
      push('Reminder set', 'success');
    } catch {
      push('Failed to set reminder', 'error');
    }
  };

  const dismissReminder = async (id: number) => {
    try {
      await mutations.dismissReminder.mutateAsync({ id, dismissed: true });
    } catch {
      push('Failed to dismiss reminder', 'error');
    }
  };

  const deleteReminder = async (id: number) => {
    try {
      await mutations.deleteReminder.mutateAsync(id);
      push('Reminder deleted', 'success');
    } catch {
      push('Failed to delete reminder', 'error');
    }
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEditEvent = (event: ClinicEvent) => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const handleSelectSlot = (start: Date) => {
    setSelectedDate(dateToDateStr(start));
  };

  const handleSelectEvent = (rbcEvent: RbcEvent) => {
    setSelectedDate(dateToDateStr(rbcEvent.start));
    openEditEvent(rbcEvent.resource);
  };

  const queryError = eventsQuery.error || tasksQuery.error || remindersQuery.error;

  if (eventsQuery.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-teal-500" size={32} />
          <p className="text-gray-400 text-sm">Loading your clinic calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {queryError ? (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          No se pudieron cargar algunos datos del calendario. Reintentando…
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 hidden sm:block">{events.length} cita(s)</p>
            <button
              onClick={openNewEvent}
              className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Nueva cita</span>
            </button>
          </div>

          <RbcCalendar
            events={rbcEvents}
            date={date}
            view={view}
            onView={setView}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
          />

          <div className="mt-6 lg:hidden">
            <DayDetail
              dateStr={selectedDate}
              events={events}
              onClose={() => setSelectedDate(null)}
              onEditEvent={openEditEvent}
              onAddEvent={openNewEvent}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="hidden lg:block">
            <DayDetail
              dateStr={selectedDate}
              events={events}
              onClose={() => setSelectedDate(null)}
              onEditEvent={openEditEvent}
              onAddEvent={openNewEvent}
            />
          </div>
          <TaskPanel
            tasks={tasks}
            selectedDate={selectedDate}
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
          <ReminderPanel
            reminders={reminders}
            onAdd={addReminder}
            onDismiss={dismissReminder}
            onDelete={deleteReminder}
          />
        </div>
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        dateStr={selectedDate}
        editingEvent={editingEvent}
        userId={userId}
        onSaved={invalidateForModal}
      />
    </div>
  );
}