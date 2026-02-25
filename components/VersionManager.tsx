'use client';

import React, { useState } from 'react';
import { isValidHistoricalDate } from '@/utils/versionUtils';

interface VersionManagerProps {
  onUpdateCurrent: () => Promise<void>;
  onSaveNew: (recordDate: Date, notes: string) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

const VersionManager: React.FC<VersionManagerProps> = ({
  onUpdateCurrent,
  onSaveNew,
  loading = false,
  disabled = false
}) => {
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [recordDate, setRecordDate] = useState<Date>(new Date());
  const [versionNotes, setVersionNotes] = useState('');
  const [dateError, setDateError] = useState('');

  const handleSaveNewVersion = async () => {
    // Validate date
    if (!isValidHistoricalDate(recordDate)) {
      setDateError('La fecha no puede ser futura');
      return;
    }
    
    setDateError('');
    
    try {
      await onSaveNew(recordDate, versionNotes);
      setShowNewVersionDialog(false);
      setVersionNotes('');
      setRecordDate(new Date());
    } catch (error) {
      console.error('Error saving new version:', error);
    }
  };

  const handleUpdateCurrent = async () => {
    try {
      await onUpdateCurrent();
    } catch (error) {
      console.error('Error updating current version:', error);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Gestión de Versiones
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Actualiza la versión actual o crea una nueva versión del historial
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpdateCurrent}
            disabled={disabled || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <i className="fas fa-edit"></i>
                <span>Actualizar Actual</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowNewVersionDialog(true)}
            disabled={disabled || loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <i className="fas fa-plus"></i>
            <span>Nueva Versión</span>
          </button>
        </div>
      </div>

      {/* New Version Dialog */}
      {showNewVersionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Crear Nueva Versión
              </h3>
              
              <div className="space-y-4">
                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha del Registro
                  </label>
                  <input
                    type="date"
                    value={recordDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setRecordDate(newDate);
                      if (dateError && isValidHistoricalDate(newDate)) {
                        setDateError('');
                      }
                    }}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {dateError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {dateError}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Seleccione la fecha del registro histórico (no puede ser futura)
                  </p>
                </div>
                
                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notas de la Versión
                  </label>
                  <textarea
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    placeholder="Describe los cambios o el motivo de esta nueva versión..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Opcional: Describe los cambios realizados en esta versión
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowNewVersionDialog(false);
                    setVersionNotes('');
                    setRecordDate(new Date());
                    setDateError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleSaveNewVersion}
                  disabled={loading || !!dateError}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      <span>Crear Versión</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VersionManager;
