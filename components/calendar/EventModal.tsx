'use client';

import { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types/calendar';

interface EventModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}

export function EventModal({ event, onClose, onSave, onDelete }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start: new Date(),
    end: new Date(),
    allDay: false,
    attendees: [] as string[],
    reminder: 10,
    reminders: [10] as number[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newReminder, setNewReminder] = useState('');

  // Function to get closest hour
  const getClosestHour = (date: Date) => {
    const newDate = new Date(date);
    newDate.setMinutes(0, 0, 0);
    return newDate;
  };

  // Function to handle start time change
  const handleStartTimeChange = (newStartTime: Date) => {
    const newEndTime = new Date(newStartTime);
    newEndTime.setHours(newEndTime.getHours() + 1);
    setFormData({ ...formData, start: newStartTime, end: newEndTime });
  };
  const addReminder = () => {
    if (newReminder && !formData.reminders.includes(parseInt(newReminder))) {
      setFormData({ ...formData, reminders: [...formData.reminders, parseInt(newReminder)] });
      setNewReminder('');
    }
  };

  const removeReminder = (index: number) => {
    setFormData({ ...formData, reminders: formData.reminders.filter((_, i) => i !== index) });
  };

  useEffect(() => {
    if (event) {
      const startDate = event.start instanceof Date ? event.start : new Date(event.start);
      const endDate = event.end instanceof Date ? event.end : new Date(event.end);
      
      setFormData({
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        start: isNaN(startDate.getTime()) ? new Date() : startDate,
        end: isNaN(endDate.getTime()) ? new Date() : endDate,
        allDay: event.allDay || false,
        attendees: event.attendees || [],
        reminder: event.reminder || 10,
        reminders: event.reminders || [10],
      });
    } else {
      // For new events, set default times
      const now = new Date();
      const closestHour = getClosestHour(now);
      const endTime = new Date(closestHour);
      endTime.setHours(endTime.getHours() + 1);
      
      setFormData(prev => ({
        ...prev,
        start: closestHour,
        end: endTime,
        reminders: [10]
      }));
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;
    
    setLoading(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date: Date | string | undefined) => {
    if (!date) {
      return '';
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {event?.id ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ubicación
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Invitados (emails separados por comas)
            </label>
            <input
              type="text"
              value={formData.attendees.join(', ')}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value.split(',').map(email => email.trim()).filter(email => email) })}
              placeholder="ejemplo@email.com, otro@email.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Recordatorios
            </label>
            <div className="space-y-2">
              {/* Display existing reminders */}
              {formData.reminders.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.reminders.map((reminder, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {reminder === 0 ? 'Sin recordatorio' : 
                       reminder === 5 ? '5 minutos' :
                       reminder === 10 ? '10 minutos' :
                       reminder === 15 ? '15 minutos' :
                       reminder === 30 ? '30 minutos' :
                       reminder === 60 ? '1 hora' :
                       reminder === 1440 ? '1 día' : `${reminder} minutos`}
                      <button
                        type="button"
                        onClick={() => removeReminder(index)}
                        className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Add new reminder */}
              <div className="flex gap-2">
                <select
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Agregar recordatorio...</option>
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={1440}>1 día</option>
                </select>
                <button
                  type="button"
                  onClick={addReminder}
                  disabled={!newReminder}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
            <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Todo el día
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Inicio
              </label>
              <input
                type={formData.allDay ? 'date' : 'datetime-local'}
                required
                value={formatDateForInput(formData.start)}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  handleStartTimeChange(date);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fin
              </label>
              <input
                type={formData.allDay ? 'date' : 'datetime-local'}
                required
                value={formatDateForInput(formData.end)}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setFormData({ ...formData, end: date });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {event?.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Eliminar
                </button>
              )}
            </div>
            <div className="space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
