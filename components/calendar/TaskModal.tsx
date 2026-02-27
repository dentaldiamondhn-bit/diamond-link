'use client';

import React, { useState, useEffect } from 'react';
import { CalendarTask, CalendarTaskWithPatient } from '../../types/calendarTasks';
import { CalendarTaskService } from '../../services/calendarTaskService';
import { InviteeNotificationService } from '../../services/inviteeNotificationService';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: CalendarTaskWithPatient | null;
  onSave: (task: CalendarTask) => void;
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

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSave, userId }) => {
  const [formData, setFormData] = useState<Partial<CalendarTask>>({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    status: 'pending',
    assigned_to: '',
    patient_id: '',
    event_id: '',
    category: 'other',
    tags: [],
    estimated_duration: 30,
    actual_duration: 0,
    completion_notes: '',
  });
  const [reminders, setReminders] = useState<Array<{ id?: string; minutes_before: number }>>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        due_date: task.due_date || '',
        priority: task.priority,
        status: task.status,
        assigned_to: task.assigned_to || '',
        patient_id: task.patient_id || '',
        event_id: task.event_id || '',
        category: task.category,
        tags: task.tags || [],
        estimated_duration: task.estimated_duration || 30,
        actual_duration: task.actual_duration || 0,
        completion_notes: task.completion_notes || '',
      });
      setSelectedPatient(task.patient || null);
      
      // Load existing reminders
      if (task.id) {
        loadReminders(task.id);
      } else {
        setReminders([{ minutes_before: 30 }]);
      }
    } else {
      // Set default values for new task
      const tomorrow = addDays(new Date(), 1);
      setFormData(prev => ({
        ...prev,
        due_date: tomorrow.toISOString().slice(0, 16),
      }));
      setReminders([{ minutes_before: 30 }]);
    }
  }, [task]);

  const loadReminders = async (taskId: string) => {
    try {
      const response = await fetch(`/api/calendar/tasks/${taskId}/reminders`);
      if (response.ok) {
        const data = await response.json();
        setReminders(data.map((r: any) => ({ id: r.id, minutes_before: r.minutes_before })));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([{ minutes_before: 30 }]);
    }
  };

  const addReminder = () => {
    const commonTimes = [10, 15, 30, 60, 120, 1440]; // Common reminder times
    const usedTimes = reminders.map(r => r.minutes_before);
    const nextTime = commonTimes.find(time => !usedTimes.includes(time)) || 0;
    setReminders([...reminders, { minutes_before: nextTime }]);
  };

  const removeReminder = (index: number) => {
    if (reminders.length > 1) {
      setReminders(reminders.filter((_, i) => i !== index));
    }
  };

  const updateReminder = (index: number, minutes_before: number) => {
    setReminders(reminders.map((r, i) => i === index ? { ...r, minutes_before } : r));
  };

  const saveReminders = async (itemId: string, itemType: 'event' | 'task') => {
    try {
      // Delete existing reminders
      const response = await fetch(`/api/calendar/${itemType}s/${itemId}/reminders`, {
        method: 'DELETE',
      });

      // Create new reminders
      const validReminders = reminders.filter(r => r.minutes_before > 0);
      if (validReminders.length > 0) {
        const reminderData = validReminders.map(reminder => ({
          item_type: itemType,
          item_id: itemId,
          minutes_before: reminder.minutes_before,
          reminder_time: new Date(
            new Date(formData.due_date).getTime() - 
            reminder.minutes_before * 60000
          ).toISOString(),
          created_by: userId,
          sent: false
        }));

        const createResponse = await fetch(`/api/calendar/${itemType}s/${itemId}/reminders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reminderData),
        });

        if (!createResponse.ok) {
          console.error('Error saving reminders:', await createResponse.text());
        }
      }
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'El título es requerido';
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
      const taskData: CalendarTask = {
        ...formData as CalendarTask,
        created_by: userId,
      };

      let savedTask: CalendarTaskWithPatient;
      
      if (task?.id) {
        savedTask = await CalendarTaskService.updateTask(task.id, taskData);
        // Notify invitees of updated task
        await InviteeNotificationService.notifyTaskInvitees(savedTask, 'updated');
      } else {
        savedTask = await CalendarTaskService.createTask(taskData);
        // Notify invitees of new task
        await InviteeNotificationService.notifyTaskInvitees(savedTask, 'created');
      }

      // Handle reminders
      if (savedTask.id) {
        await saveReminders(savedTask.id, 'task');
      }

      onSave(taskData);
      onClose();
    } catch (error) {
      setErrors({ submit: 'Error al guardar la tarea' });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patient.paciente_id }));
  };

  const handleRemovePatient = () => {
    setSelectedPatient(null);
    setFormData(prev => ({ ...prev, patient_id: '' }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {task ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title with Patient Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título de la Tarea
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Ej: Llamada de seguimiento"
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
                placeholder="Detalles de la tarea..."
              />
            </div>

            {/* Due Date and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {/* Multiple Reminders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recordatorios
                  </label>
                  <button
                    type="button"
                    onClick={addReminder}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    <i className="fas fa-plus mr-1"></i>
                    Agregar
                  </button>
                </div>
                
                {reminders.map((reminder, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <select
                      value={reminder.minutes_before}
                      onChange={(e) => updateReminder(index, parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value={0}>Sin recordatorio</option>
                      <option value={10}>10 minutos</option>
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={120}>2 horas</option>
                      <option value={180}>3 horas</option>
                      <option value={360}>6 horas</option>
                      <option value={720}>12 horas</option>
                      <option value={1440}>1 día</option>
                      <option value={2880}>2 días</option>
                      <option value={4320}>3 días</option>
                      <option value={10080}>1 semana</option>
                    </select>
                    
                    {reminders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeReminder(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Eliminar recordatorio"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                ))}
                
                {reminders.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No hay recordatorios configurados
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="admin">Administrativo</option>
                  <option value="clinical">Clínico</option>
                  <option value="follow_up">Seguimiento</option>
                  <option value="documentation">Documentación</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

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
            </div>

            {/* Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duración Estimada (minutos)
                </label>
                <input
                  type="number"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duración Real (minutos)
                </label>
                <input
                  type="number"
                  value={formData.actual_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, actual_duration: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  min="0"
                  disabled={formData.status !== 'completed'}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Etiquetas
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Agregar etiqueta..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Completion Notes */}
            {formData.status === 'completed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas de Completado
                </label>
                <textarea
                  value={formData.completion_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, completion_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Notas sobre la completación de la tarea..."
                />
              </div>
            )}

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
                {loading ? 'Guardando...' : (task ? 'Actualizar' : 'Crear')}
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
