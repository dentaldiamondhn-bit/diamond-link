'use client';

import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import type { View, ViewProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RbcEvent } from '@/calendario/rbcAdapter';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { es },
});

const messages = {
  today: 'Hoy',
  previous: 'Anterior',
  next: 'Siguiente',
  month: 'Mes',
  week: 'Semana',
  work_week: 'Semana laboral',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  allDay: 'Todo el día',
  noEventsInRange: 'No hay citas en este rango',
};

export interface RbcCalendarProps {
  events: RbcEvent[];
  date: Date;
  view: View;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectSlot: (start: Date) => void;
  onSelectEvent: (event: RbcEvent) => void;
}

export default function RbcCalendar({
  events,
  date,
  view,
  onView,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
}: RbcCalendarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <Calendar
        localizer={localizer}
        culture="es"
        messages={messages}
        events={events}
        date={date}
        view={view}
        onView={onView}
        onNavigate={(newDate) => onNavigate(newDate)}
        views={[Views.MONTH, Views.WEEK, Views.WORK_WEEK, Views.DAY, Views.AGENDA]}
        selectable
        popup
        onSelectSlot={({ start }) => onSelectSlot(start)}
        onSelectEvent={(event) => onSelectEvent(event as RbcEvent)}
        eventPropGetter={(event) => {
          const rbcEvent = event as RbcEvent;
          return { style: { backgroundColor: rbcEvent.color, borderColor: rbcEvent.color } };
        }}
      />
    </div>
  );
}

export type { ViewProps };