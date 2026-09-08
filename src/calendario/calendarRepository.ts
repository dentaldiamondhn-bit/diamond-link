import type { ClinicEvent, Task, Reminder } from '@/lib/types-calendar';
import type { ParticipantMap } from '@/app/api/events/participants/route';

export interface EventRange {
  /** Inclusive YYYY-MM-DD start of the window. */
  from: string;
  /** Inclusive YYYY-MM-DD end of the window. */
  to: string;
}

/** Persistable event payload (mirrors the `EventModal` form + route defaults). */
export interface EventInput {
  title: string;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  notes: string;
  description?: string;
  location?: string;
  event_type?: ClinicEvent['event_type'];
  status?: ClinicEvent['status'];
  priority?: ClinicEvent['priority'];
  reminder_minutes?: number;
  patient_id?: string;
  procedure?: string;
  dentist?: string;
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      // keep the default message
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const REQUEST: RequestInit = {
  cache: 'no-store',
};

/**
 * Thin data-access layer for the calendario shell (Phase 2).
 *
 * Every method returns raw domain types and lets react-query own caching. The
 * enum-style column defaults (event `status`, `priority`, …) stay untouched so
 * the server route keeps applying them, exactly like chat's repository+service
 * split. Identity for all requests comes from the Clerk session resolved
 * server-side (`authorizeCalendar`); this layer never sends `x-user-id`.
 */
export class CalendarRepository {
  // ---------------------------------------------------------------- events
  static async getEvents(range?: EventRange): Promise<ClinicEvent[]> {
    const params = new URLSearchParams();
    if (range) {
      params.set('date_from', range.from);
      params.set('date_to', range.to);
    }
    const qs = params.toString();
    return readJson<ClinicEvent[]>(
      await fetch(`/api/events${qs ? `?${qs}` : ''}`, REQUEST)
    );
  }

  static async createEvent(payload: EventInput): Promise<ClinicEvent> {
    return readJson<ClinicEvent>(
      await fetch('/api/events', {
        ...REQUEST,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
  }

  static async updateEvent(id: number, updates: Partial<EventInput>): Promise<ClinicEvent> {
    return readJson<ClinicEvent>(
      await fetch('/api/events', {
        ...REQUEST,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
    );
  }

  static async deleteEvent(id: number): Promise<void> {
    await readJson<{ ok: boolean }>(
      await fetch('/api/events', {
        ...REQUEST,
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    );
  }

  /** Batched participants for many events (N+1 killer — dashboard panel + agenda rows). */
  static async getParticipants(eventIds: number[]): Promise<ParticipantMap> {
    const ids = [...new Set(eventIds)].filter((id) => Number.isFinite(id));
    if (ids.length === 0) return {};
    return readJson<ParticipantMap>(
      await fetch(`/api/events/participants?ids=${ids.join(',')}`, REQUEST)
    );
  }

  // ----------------------------------------------------------------- tasks
  static async getTasks(): Promise<Task[]> {
    return readJson<Task[]>(await fetch('/api/tasks', REQUEST));
  }

  static async createTask(title: string, priority: Task['priority'], due_date: string): Promise<Task> {
    return readJson<Task>(
      await fetch('/api/tasks', {
        ...REQUEST,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, due_date }),
      })
    );
  }

  static async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    return readJson<Task>(
      await fetch('/api/tasks', {
        ...REQUEST,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
    );
  }

  static async deleteTask(id: number): Promise<void> {
    await readJson<{ ok: boolean }>(
      await fetch('/api/tasks', {
        ...REQUEST,
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    );
  }

  // ------------------------------------------------------------- reminders
  static async getReminders(): Promise<Reminder[]> {
    return readJson<Reminder[]>(await fetch('/api/reminders', REQUEST));
  }

  static async createReminder(message: string, remind_at: string): Promise<Reminder> {
    return readJson<Reminder>(
      await fetch('/api/reminders', {
        ...REQUEST,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, remind_at }),
      })
    );
  }

  static async updateReminder(id: number, updates: Partial<Reminder>): Promise<Reminder> {
    return readJson<Reminder>(
      await fetch('/api/reminders', {
        ...REQUEST,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
    );
  }

  static async deleteReminder(id: number): Promise<void> {
    await readJson<{ ok: boolean }>(
      await fetch('/api/reminders', {
        ...REQUEST,
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    );
  }
}