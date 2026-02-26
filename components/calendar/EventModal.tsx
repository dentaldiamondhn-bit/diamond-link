'use client';

import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarEventWithPatient } from '../../types/calendar';
import { CalendarEventWithInvitees } from '../../types/calendarInvitees';
import { CalendarService } from '../../services/calendarService';
import { CalendarInviteesService } from '../../services/calendarInviteesService';
import { CalendarReminderService } from '../../services/calendarReminderService';
import { UserSelect } from './UserSelect';
import { format, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEventWithPatient | null;
  onSave: (event: CalendarEvent) => void;
  userId: string;
}

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: any) => void;
}

const PatientSearchModal: React.FC<PatientSearchModalProps> = ({ isOpen, onClose, onSelectPatient }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setPatients([]);
      return;
    }

    const searchPatients = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setPatients(data.slice(0, 5)); // Limit to 5 results
        }
      } catch (error) {
        console.error('Error searching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Buscar Paciente
        </h3>
        
        <input
          type="text"
          placeholder="Buscar por nombre o ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
          autoFocus
        />

        <div className="mt-4 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : patients.length > 0 ? (
            patients.map((patient) => (
              <div
                key={patient.paciente_id}
                className={`p-3 border border-gray-200 dark:border-gray-600 rounded-md mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedPatient?.paciente_id === patient.paciente_id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                }`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {patient.nombre_completo}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {patient.numero_identidad} • {patient.telefono}
                </div>
              </div>
            ))
          ) : searchQuery.trim() !== '' ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No se encontraron pacientes
            </div>
          ) : null}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (selectedPatient) {
                onSelectPatient(selectedPatient);
                onClose();
              }
            }}
            disabled={!selectedPatient}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Seleccionar
          </button>
        </div>
      </div>
    </div>
  );
};

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, event, onSave, userId }) => {
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    all_day: false,
    location: '',
    event_type: 'appointment',
    status: 'scheduled',
    priority: 'medium',
    patient_id: '',
    doctor_id: '',
    notes: '',
    reminder_minutes: 30,
  });
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start_date: formatDateTimeLocal(event.start_date),
        end_date: formatDateTimeLocal(event.end_date),
        all_day: event.all_day || false,
        location: event.location || '',
        event_type: event.event_type || 'appointment',
        status: event.status || 'scheduled',
        priority: event.priority || 'medium',
        patient_id: event.patient_id || '',
        doctor_id: event.doctor_id || '',
        notes: event.notes || '',
        reminder_minutes: event.reminder_minutes || 30,
      });
      setSelectedPatient(event.patient || null);
      
      // Load invitees for existing event
      if (event.id) {
        loadInvitees(event.id);
      }
    } else {
      // Set default values for new event
      const now = new Date();
      // Format for HTML datetime-local input (yyyy-MM-ddThh:mm)
      const startTime = format(now, "yyyy-MM-dd'T'HH:mm", { locale: es });
      const endTime = format(addMinutes(now, 60), "yyyy-MM-dd'T'HH:mm", { locale: es });
      
      setFormData(prev => ({
        ...prev,
        start_date: startTime,
        end_date: endTime,
      }));
      setSelectedUsers([]);
    }
  }, [event]);

  const loadInvitees = async (eventId: string) => {
    try {
      const invitees = await CalendarInviteesService.getInviteesForItem('event', eventId);
      setSelectedUsers(invitees.map(invitee => invitee.user));
    } catch (error) {
      console.error('Error loading invitees:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'El título es requerido';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es requerida';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'La fecha de fin es requerida';
    }
    if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
      newErrors.end_date = 'La fecha de fin debe ser posterior a la de inicio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const eventData: CalendarEvent = {
        ...formData as CalendarEvent,
        created_by: userId, // Use original Clerk user ID
      };

      let savedEvent: CalendarEventWithPatient;
      
      if (event?.id) {
        savedEvent = await CalendarService.updateEvent(event.id, eventData);
        // Create notification for updated event
        await CalendarReminderService.createEventNotification(
          { ...savedEvent, patient: selectedPatient },
          'updated'
        );
      } else {
        savedEvent = await CalendarService.createEvent(eventData);
        // Create notification for new event
        await CalendarReminderService.createEventNotification(
          { ...savedEvent, patient: selectedPatient },
          'created'
        );
      }

      // Handle invitees
      if (savedEvent.id) {
        // Delete existing invitees
        await CalendarInviteesService.deleteInviteesForItem('event', savedEvent.id);
        
        // Create new invitees
        if (selectedUsers.length > 0) {
          const inviteesData = selectedUsers.map(user => ({
            item_type: 'event' as const,
            item_id: savedEvent.id,
            user_id: user.id, // Use original Clerk user ID
            status: 'pending' as const,
            created_by: userId // Use original Clerk user ID
          }));
          
          await CalendarInviteesService.createMultipleInvitees(inviteesData);
        }
      }

      onSave(eventData);
      onClose();
    } catch (error) {
      setErrors({ submit: 'Error al guardar el evento' });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert Clerk user ID to valid UUID format for Supabase
const clerkIdToUuid = (clerkId: string): string => {
  // Generate a proper UUID v4 using crypto API
  // This ensures compatibility with Supabase UUID fields
  return crypto.randomUUID();
};

// Helper function to handle Clerk user ID compatibility
const handleUserId = (userId: string): string => {
  // Use crypto.randomUUID() which always generates valid UUID v4
  // This ensures Supabase compatibility
  return crypto.randomUUID();
};

// Helper function to format date for HTML datetime-local input
const formatDateTimeLocal = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Format as yyyy-MM-ddThh:mm (local time)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ 
      ...prev, 
      patient_id: patient.paciente_id,
      title: prev.title || `Cita con ${patient.nombre_completo}` // Auto-populate title if empty
    }));
  };

  const handleRemovePatient = () => {
    setSelectedPatient(null);
    setFormData(prev => ({ ...prev, patient_id: '' }));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title with Patient Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título del Evento
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Ej: Consulta con paciente"
                />
                <button
                  type="button"
                  onClick={() => setShowPatientSearch(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  title="Buscar paciente"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Selected Patient Display */}
            {selectedPatient && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-600">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      Paciente: {selectedPatient.nombre_completo}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      ID: {selectedPatient.numero_identidad} • {selectedPatient.telefono}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePatient}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="Detalles del evento..."
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha y Hora Inicio
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    errors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha y Hora Fin
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    errors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
              </div>
            </div>

            {/* All Day Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="all_day"
                checked={formData.all_day}
                onChange={(e) => setFormData(prev => ({ ...prev, all_day: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="all_day" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Todo el día
              </label>
            </div>

            {/* Invitees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invitados (Opcional)
              </label>
              <UserSelect
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
                placeholder="Seleccionar usuarios para invitar..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Los usuarios seleccionados recibirán una invitación a este evento
              </p>
            </div>

            {/* Event Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="appointment">Cita</option>
                  <option value="consultation">Consulta</option>
                  <option value="surgery">Cirugía</option>
                  <option value="follow_up">Seguimiento</option>
                  <option value="reminder">Recordatorio</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="scheduled">Programado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="completed">Completado</option>
                </select>
              </div>
            </div>

            {/* Priority and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prioridad
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Ej: Consultorio 1"
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recordatorio (minutos antes)
              </label>
              <select
                value={formData.reminder_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, reminder_minutes: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value={0}>Sin recordatorio</option>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
                <option value={1440}>1 día</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="Notas adicionales..."
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-600">
                <p className="text-red-700 dark:text-red-300">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : (event ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <PatientSearchModal
        isOpen={showPatientSearch}
        onClose={() => setShowPatientSearch(false)}
        onSelectPatient={handlePatientSelect}
      />
    </>
  );
};
