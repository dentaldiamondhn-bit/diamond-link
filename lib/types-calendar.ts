export interface ClinicEvent {
  id: number;
  user_id: string;
  title: string;
  patient_name: string;
  procedure: string;
  dentist: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  notes: string;
  description?: string;
  location?: string;
  event_type?: 'appointment' | 'consultation' | 'surgery' | 'follow_up' | 'reminder' | 'other';
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  reminder_minutes?: number;
  patient_id?: string;
  created_at: string;
}

export interface Task {
  id: number;
  user_id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  completed: boolean;
  created_at: string;
}

export interface Reminder {
  id: number;
  user_id: string;
  message: string;
  remind_at: string;
  dismissed: boolean;
  created_at: string;
}

export const PROCEDURES = [
  'Cleaning',
  'Checkup',
  'Filling',
  'Root Canal',
  'Crown',
  'Extraction',
  'Whitening',
  'X-Ray',
  'Orthodontic',
  'Implant',
  'Other',
];

export const DENTISTS = ['Dr. Smith', 'Dr. Lee', 'Dr. Patel', 'Dr. Garcia', 'Dr. Nguyen'];

export const EVENT_COLORS = [
  { name: 'teal', value: '#0d9488' },
  { name: 'blue', value: '#2563eb' },
  { name: 'violet', value: '#7c3aed' },
  { name: 'rose', value: '#e11d48' },
  { name: 'amber', value: '#d97706' },
  { name: 'emerald', value: '#059669' },
];
