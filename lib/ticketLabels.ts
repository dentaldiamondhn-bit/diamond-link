import { TicketStatus, TicketPriority, ActivityType } from '@/types/ticket';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Abierto',
  [TicketStatus.IN_PROGRESS]: 'En Progreso',
  [TicketStatus.PENDING_REVIEW]: 'Revisión Pendiente',
  [TicketStatus.RESOLVED]: 'Resuelto',
  [TicketStatus.CLOSED]: 'Cerrado',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Baja',
  [TicketPriority.MEDIUM]: 'Media',
  [TicketPriority.HIGH]: 'Alta',
  [TicketPriority.URGENT]: 'Urgente',
};

export const TYPE_LABELS: Record<string, string> = {
  SYSTEM_ISSUE: 'Problema del Sistema',
  IMPLEMENTATION: 'Implementación',
  TASK: 'Tarea',
  REMINDER: 'Recordatorio',
  PATIENT_CASE: 'Caso de Paciente',
  MAINTENANCE: 'Mantenimiento',
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  [ActivityType.STATUS_CHANGE]: 'Cambio de estado',
  [ActivityType.COMMENT]: 'Comentario',
  [ActivityType.ASSIGNMENT]: 'Asignación',
  [ActivityType.EDIT]: 'Edición',
};

export const STATUS_CHANGE_CONTENT = (oldStatus: string, newStatus: string) => {
  const oldLabel = STATUS_LABELS[oldStatus as TicketStatus] || oldStatus;
  const newLabel = STATUS_LABELS[newStatus as TicketStatus] || newStatus;
  return `Estado cambiado de "${oldLabel}" a "${newLabel}"`;
};

export const ASSIGNMENT_CONTENT = (userName: string) => {
  return `Asignado a ${userName}`;
};

export const PRIORITY_CHANGE_CONTENT = (oldPriority: string, newPriority: string) => {
  const oldLabel = PRIORITY_LABELS[oldPriority as TicketPriority] || oldPriority;
  const newLabel = PRIORITY_LABELS[newPriority as TicketPriority] || newPriority;
  return `Prioridad cambiada de "${oldLabel}" a "${newLabel}"`;
};
