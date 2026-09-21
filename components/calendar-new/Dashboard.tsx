'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import type { ClinicEvent, Task, Reminder, EventReminder } from '@/lib/types-calendar';
import CalendarGrid from '@/components/calendar-new/CalendarGrid';
import DayDetail from '@/components/calendar-new/DayDetail';
import EventModal, { type ModalPrefill } from '@/components/calendar-new/EventModal';
import TaskPanel from '@/components/calendar-new/TaskPanel';
import ReminderPanel from '@/components/calendar-new/ReminderPanel';
import { useToast } from '@/components/calendar-new/Toast';

interface Props {
  userId: string;
}

const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export default function Dashboard({ userId }: Props) {
  const { push } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [events, setEvents] = useState<ClinicEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [eventReminders, setEventReminders] = useState<EventReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClinicEvent | null>(null);
  const [modalPrefill, setModalPrefill] = useState<ModalPrefill | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<ClinicEvent | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [evRes, taskRes, remRes] = await Promise.all([
        fetch('/api/events', {
          headers: { 'x-user-id': userId },
        }),
        fetch('/api/tasks', {
          headers: { 'x-user-id': userId },
        }),
        fetch('/api/reminders', {
          headers: { 'x-user-id': userId },
        }),
      ]);
      const [evData, taskData, remData] = await Promise.all([evRes.json(), taskRes.json(), remRes.json()]);
      const ids = ((evData || []) as ClinicEvent[]).map((e) => e.id);
      const eventRem = ids.length
        ? await fetch(`/api/events/reminders?ids=${ids.join(',')}`, {
            headers: { 'x-user-id': userId },
          })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        : [];
      setEvents(evData || []);
      setTasks(taskData || []);
      setReminders(remData || []);
      setEventReminders(eventRem || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTask = async (title: string, priority: Task['priority'], due_date: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ title, priority, due_date }),
      });
      if (!res.ok) throw new Error('Failed to add task');
      push('Tarea añadida', 'success');
      fetchAll();
    } catch {
      push('No se pudo añadir la tarea', 'error');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ id: task.id, completed: !task.completed }),
      });
      if (!res.ok) throw new Error('Failed to update task');
      fetchAll();
    } catch {
      push('No se pudo actualizar la tarea', 'error');
    }
  };

  const deleteTask = async (id: number) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete task');
      push('Tarea eliminada', 'success');
      fetchAll();
    } catch {
      push('No se pudo eliminar la tarea', 'error');
    }
  };

  const addReminder = async (message: string, remind_at: string) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ message, remind_at }),
      });
      if (!res.ok) throw new Error('Failed to set reminder');
      push('Recordatorio fijado', 'success');
      fetchAll();
    } catch {
      push('No se pudo fijar el recordatorio', 'error');
    }
  };

  const dismissReminder = async (id: number) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ id, dismissed: true }),
      });
      if (!res.ok) throw new Error('Failed to dismiss reminder');
      fetchAll();
    } catch {
      push('No se pudo descartar el recordatorio', 'error');
    }
  };

  const deleteReminder = async (id: number) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete reminder');
      push('Recordatorio eliminado', 'success');
      fetchAll();
    } catch {
      push('No se pudo eliminar el recordatorio', 'error');
    }
  };

  const deleteEventReminder = async (eventId: number, reminderId: number) => {
    try {
      const res = await fetch(`/api/events/${eventId}/reminders`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ reminder_id: reminderId }),
      });
      if (!res.ok) throw new Error('Failed to delete event reminder');
      push('Recordatorio de cita eliminado', 'success');
      fetchAll();
    } catch {
      push('No se pudo eliminar el recordatorio de la cita', 'error');
    }
  };

  const monthLabel = `${MONTHS_LONG[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDate(t.toISOString().slice(0, 10));
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setModalPrefill(null);
    setDuplicateOf(null);
    setModalOpen(true);
  };

  const openEditEvent = (event: ClinicEvent) => {
    setEditingEvent(event);
    setModalPrefill(null);
    setDuplicateOf(null);
    setModalOpen(true);
  };

  const openDuplicateEvent = (event: ClinicEvent) => {
    setSelectedDate(event.date);
    setDuplicateOf(event);
    setEditingEvent(null);
    setModalPrefill(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-teal-500" size={32} />
          <p className="text-gray-400 text-sm">Cargando tu agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold text-gray-800 min-w-[180px] text-center">{monthLabel}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goToday} className="text-sm font-medium text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition">
                Hoy
              </button>
              <button onClick={openNewEvent} className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm">
                <Plus size={16} /> <span className="hidden sm:inline">Nueva cita</span>
              </button>
            </div>
          </div>

          <CalendarGrid
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <div className="mt-6 lg:hidden">
            <DayDetail
              dateStr={selectedDate}
              events={events}
              onClose={() => setSelectedDate(null)}
              onEditEvent={openEditEvent}
              onDuplicate={openDuplicateEvent}
              onAddEvent={openNewEvent}
            />
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="hidden lg:block">
            <DayDetail
              dateStr={selectedDate}
              events={events}
              onClose={() => setSelectedDate(null)}
              onEditEvent={openEditEvent}
              onDuplicate={openDuplicateEvent}
              onAddEvent={openNewEvent}
            />
          </div>
          <ReminderPanel
            reminders={reminders}
            eventReminders={eventReminders}
            onAdd={addReminder}
            onDismiss={dismissReminder}
            onDelete={deleteReminder}
            onDeleteEventReminder={deleteEventReminder}
          />
          <TaskPanel
            tasks={tasks}
            selectedDate={selectedDate}
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        </div>
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null); setDuplicateOf(null); }}
        dateStr={selectedDate}
        editingEvent={editingEvent}
        userId={userId}
        prefill={modalPrefill}
        duplicateOf={duplicateOf}
        onDuplicate={openDuplicateEvent}
        onSaved={fetchAll}
      />
    </div>
  );
}
