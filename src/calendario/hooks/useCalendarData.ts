'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ClinicEvent, Task, Reminder } from '@/lib/types-calendar';
import {
  CalendarRepository,
  type EventInput,
  type EventRange,
} from '@/calendario/calendarRepository';

export const calendarKeys = {
  all: ['calendario'] as const,
  events: (range: EventRange) => ['calendario', 'events', range] as const,
  eventsList: ['calendario', 'events'] as const,
  tasks: ['calendario', 'tasks'] as const,
  reminders: ['calendario', 'reminders'] as const,
};

/** Events inside a date window — cache is keyed per range (C16: no full refetch on nav). */
export function useCalendarEvents(range: EventRange): UseQueryResult<ClinicEvent[], Error> {
  return useQuery({
    queryKey: calendarKeys.events(range),
    queryFn: () => CalendarRepository.getEvents(range),
  });
}

export function useCalendarTasks(): UseQueryResult<Task[], Error> {
  return useQuery({
    queryKey: calendarKeys.tasks,
    queryFn: () => CalendarRepository.getTasks(),
  });
}

export function useCalendarReminders(): UseQueryResult<Reminder[], Error> {
  return useQuery({
    queryKey: calendarKeys.reminders,
    queryFn: () => CalendarRepository.getReminders(),
  });
}

export function useInvalidateCalendar() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: calendarKeys.all });
}

export interface CalendarMutations {
  createEvent: UseMutationResult<ClinicEvent, Error, EventInput>;
  updateEvent: UseMutationResult<ClinicEvent, Error, { id: number; updates: Partial<EventInput> }>;
  deleteEvent: UseMutationResult<void, Error, number>;
  addTask: UseMutationResult<Task, Error, { title: string; priority: Task['priority']; due_date: string }>;
  toggleTask: UseMutationResult<Task, Error, { id: number; completed: boolean }>;
  deleteTask: UseMutationResult<void, Error, number>;
  addReminder: UseMutationResult<Reminder, Error, { message: string; remind_at: string }>;
  dismissReminder: UseMutationResult<Reminder, Error, { id: number; dismissed: boolean }>;
  deleteReminder: UseMutationResult<void, Error, number>;
}

/**
 * CRUD mutations with optimistic task toggle + invalidate-on-action. Invalidates
 * the whole `calendario` key so range- and list-caches all settle (the same
 * invalidation realtime uses, so no stale window survives an action).
 */
export function useCalendarMutations(): CalendarMutations {
  const queryClient = useQueryClient();
  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: calendarKeys.all });

  const createEvent = useMutation({
    mutationFn: (payload: EventInput) => CalendarRepository.createEvent(payload),
    onSuccess: invalidateAll,
  });
  const updateEvent = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<EventInput> }) =>
      CalendarRepository.updateEvent(id, updates),
    onSuccess: invalidateAll,
  });
  const deleteEvent = useMutation({
    mutationFn: (id: number) => CalendarRepository.deleteEvent(id),
    onSuccess: invalidateAll,
  });

  const addTask = useMutation({
    mutationFn: ({ title, priority, due_date }: { title: string; priority: Task['priority']; due_date: string }) =>
      CalendarRepository.createTask(title, priority, due_date),
    onSuccess: invalidateAll,
  });
  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      CalendarRepository.updateTask(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: calendarKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(calendarKeys.tasks);
      queryClient.setQueryData<Task[]>(calendarKeys.tasks, (old) =>
        old?.map((t) => (t.id === id ? { ...t, completed } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(calendarKeys.tasks, ctx.previous);
    },
    onSettled: invalidateAll,
  });
  const deleteTask = useMutation({
    mutationFn: (id: number) => CalendarRepository.deleteTask(id),
    onSuccess: invalidateAll,
  });

  const addReminder = useMutation({
    mutationFn: ({ message, remind_at }: { message: string; remind_at: string }) =>
      CalendarRepository.createReminder(message, remind_at),
    onSuccess: invalidateAll,
  });
  const dismissReminder = useMutation({
    mutationFn: ({ id, dismissed }: { id: number; dismissed: boolean }) =>
      CalendarRepository.updateReminder(id, { dismissed }),
    onSuccess: invalidateAll,
  });
  const deleteReminder = useMutation({
    mutationFn: (id: number) => CalendarRepository.deleteReminder(id),
    onSuccess: invalidateAll,
  });

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    addTask,
    toggleTask,
    deleteTask,
    addReminder,
    dismissReminder,
    deleteReminder,
  };
}