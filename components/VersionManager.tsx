'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isValidHistoricalDate,
  NewVersionTemplateData,
  OrthodonticVersion,
  seedVersionTemplate,
} from '@/utils/versionUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import DocumentDisplay from '@/components/DocumentDisplay';

interface VersionManagerProps {
  onUpdateCurrent: () => Promise<void>;
  onSaveNew: (data: NewVersionTemplateData) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  newVersionSignal?: number;
  selectedVersion?: OrthodonticVersion | null;
  versions?: OrthodonticVersion[];
  isLocked?: boolean;
  patientId?: string | null;
}

const RADIOGRAPHIES = [
  { value: 'panoramica', label: 'Panorámica' },
  { value: 'periapical', label: 'Periapical' },
  { value: 'oclusal', label: 'Oclusal' },
  { value: 'lateral_craneo', label: 'Lateral de Cráneo' },
];

const TIPO_MORDIDA_OPTIONS = [
  { value: 'clase_i', label: 'Clase I' },
  { value: 'clase_ii_division_1', label: 'Clase II Division 1' },
  { value: 'clase_ii_division_2', label: 'Clase II Division 2' },
  { value: 'clase_iii', label: 'Clase III' },
  { value: 'mordida_abierta_anterior', label: 'Mordida Abierta Anterior' },
  { value: 'mordida_abierta_posterior', label: 'Mordida Abierta Posterior' },
  { value: 'mordida_cruzada_anterior', label: 'Mordida Cruzada Anterior' },
  { value: 'mordida_cruzada_posterior', label: 'Mordida Cruzada Posterior' },
  { value: 'mordida_profunda', label: 'Mordida Profunda' },
];

const TIPO_APARATO_OPTIONS = [
  { value: 'brackets_metalicos', label: 'Brackets Metálicos' },
  { value: 'brackets_ceramicos', label: 'Brackets Cerámicos' },
  { value: 'brackets_zafiro', label: 'Brackets de Zafiro' },
  { value: 'invisalign', label: 'Invisalign' },
  { value: 'aparato_removible', label: 'Aparato Removible' },
  { value: 'expansion_palatina', label: 'Expansión Palatina' },
  { value: 'mantenedor_espacio', label: 'Mantenedor de Espacio' },
];

const RETENEDOR_TIPO_OPTIONS = [
  { value: 'fijo', label: 'Fijo' },
  { value: 'removible', label: 'Removible' },
  { value: 'hawley_convencional', label: 'Hawley Convencional' },
  { value: 'hawley_arco_continuo', label: 'Hawley Arco Continuo' },
  { value: 'hawley_arco_continuo_banda_anterior', label: 'Hawley Arco Continuo Banda Anterior' },
  { value: 'invisible', label: 'Invisible' },
  { value: 'sin_retenedor', label: 'Sin retenedor' },
];

const RETENEDOR_USO_OPTIONS = [
  { value: 'tiempo_completo', label: 'Tiempo completo' },
  { value: 'noche', label: 'Solo noche' },
  { value: 'ocasional', label: 'Ocasional' },
  { value: 'no_usa', label: 'No usa' },
];

const MODALOS_ESTUDIO_OPTIONS = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
  { value: 'en_proceso', label: 'En proceso' },
];

const VersionManager: React.FC<VersionManagerProps> = ({
  onUpdateCurrent,
  onSaveNew,
  loading = false,
  disabled = false,
  newVersionSignal = 0,
  selectedVersion = null,
  versions = [],
  isLocked = false,
  patientId = null
}) => {
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [template, setTemplate] = useState<NewVersionTemplateData>(() => seedVersionTemplate(null));
  const [dateError, setDateError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // The "Actual" version is the one with the highest version number,
  // matching the badge logic used in the Timeline
  const latestVersionNumber = versions.reduce(
    (max, version) => Math.max(max, version.versionNumber),
    0
  );
  const isSelectedLatest = !!selectedVersion && selectedVersion.versionNumber === latestVersionNumber;

  // The version used to seed the new-version template: the selected version
  // when available, otherwise the latest one.
  const seedVersion = useMemo<OrthodonticVersion | null>(() => {
    if (selectedVersion) return selectedVersion;
    if (!versions.length) return null;
    return versions.reduce((latest, v) =>
      v.versionNumber > latest.versionNumber ? v : latest
    );
  }, [selectedVersion, versions]);

  const openNewVersionDialog = useCallback(() => {
    setTemplate(seedVersionTemplate(seedVersion));
    setDateError('');
    setSaveError('');
    setShowNewVersionDialog(true);
  }, [seedVersion]);

  useEffect(() => {
    if (newVersionSignal > 0) {
      openNewVersionDialog();
    }
  }, [newVersionSignal, openNewVersionDialog]);

  const setField = (field: keyof NewVersionTemplateData, value: string) => {
    setTemplate((prev) => ({ ...prev, [field]: value }));
  };

  const getRadiografias = (): string[] =>
    (template.radiografiasRealizadas || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const toggleRadiografia = (value: string) => {
    const current = getRadiografias();
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setField('radiografiasRealizadas', next.join(', '));
  };

  const duracionMeses = parseInt(template.duracionTratamiento || '12', 10) || 12;

  const handleSaveNewVersion = async () => {
    // Validate date
    if (!isValidHistoricalDate(template.recordDate)) {
      setDateError('La fecha no puede ser futura');
      return;
    }

    setDateError('');
    setSaveError('');

    try {
      await onSaveNew(template);
      setShowNewVersionDialog(false);
    } catch (error) {
      console.error('Error saving new version:', error);
      setSaveError(error instanceof Error ? error.message : 'No se pudo crear la versión');
    }
  };

  const handleUpdateCurrent = async () => {
    try {
      await onUpdateCurrent();
    } catch (error) {
      console.error('Error updating current version:', error);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('patientId', patientId || 'new');
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload-orthodontic-documents', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir documentos');
      }

      if (result.allDocuments) {
        setTemplate((prev) => ({ ...prev, documentosOrtodoncia: result.allDocuments }));
        setUploadSuccess(`${files.length} documento(s) subido(s) correctamente`);
        setTimeout(() => setUploadSuccess(''), 4000);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Error al subir documentos');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeDocument = (index: number) => {
    setTemplate((prev) => ({
      ...prev,
      documentosOrtodoncia: (prev.documentosOrtodoncia || []).filter((_, i) => i !== index),
    }));
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  const sectionHeader = (icon: string, color: string, title: string) => (
    <h4 className={`text-sm font-bold ${color} mb-3 flex items-center gap-2`}>
      <i className={`fas ${icon}`}></i>
      {title}
    </h4>
  );

  const selectField = (
    field: keyof NewVersionTemplateData,
    label: string,
    options: { value: string; label: string }[]
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={(template[field] as string) || ''}
        onChange={(e) => setField(field, e.target.value)}
        className={inputClass}
      >
        <option value="">Seleccione...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const textareaField = (
    field: keyof NewVersionTemplateData,
    label: string,
    rows: number,
    placeholder: string
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea
        value={(template[field] as string) || ''}
        onChange={(e) => setField(field, e.target.value)}
        rows={rows}
        className={`${inputClass} resize-none`}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/20 p-5 shadow-md hover:shadow-lg transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer"></div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <i className="fas fa-code-branch text-teal-600"></i>
            Gestión de Versiones
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Actualiza la versión actual o crea una nueva versión del historial
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {selectedVersion && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-600/10 dark:bg-teal-500/20 border border-teal-600/30 dark:border-teal-500/30 text-sm text-teal-700 dark:text-teal-300 font-medium">
              <i className="fas fa-check-circle text-teal-600 dark:text-teal-400"></i>
              <span>Versión seleccionada:</span>
              <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-xs font-bold">
                v{selectedVersion.versionNumber}
              </span>
              {isSelectedLatest && (
                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold">
                  Actual
                </span>
              )}
            </span>
          )}
        
          <button
            onClick={handleUpdateCurrent}
            disabled={disabled || loading || isLocked}
            title={isLocked ? 'Versión histórica: usa "Admin / Support Unlock" para desbloquear' : undefined}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <i className={`${isLocked ? 'fas fa-lock' : 'fas fa-edit'}`}></i>
                <span>{isLocked ? 'Bloqueado' : 'Actualizar Actual'}</span>
              </>
            )}
          </button>
          
          <button
            onClick={openNewVersionDialog}
            disabled={disabled || loading}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <i className="fas fa-plus"></i>
            <span>Nueva Versión</span>
          </button>
        </div>
        </div>
      </div>

      {/* New Version Dialog — full clinical template seeded from the previous version */}
      {showNewVersionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <i className="fas fa-code-branch text-teal-600"></i>
                Crear Nueva Versión
                <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-xs font-bold">
                  v{latestVersionNumber + 1}
                </span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                La plantilla se precarga con los datos de la versión{' '}
                {seedVersion ? `v${seedVersion.versionNumber}` : 'anterior'}; modifica solo lo que
                cambie para la nueva versión.
              </p>

              <div className="space-y-4">
                {/* Registro + Notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Fecha del Registro</label>
                    <input
                      type="date"
                      value={SimpleTimezoneFix.toDateString(template.recordDate)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
                        const newDate = new Date(raw + 'T00:00:00');
                        if (isNaN(newDate.getTime())) return;
                        if (newDate.getFullYear() < 1900) return;
                        setTemplate((prev) => ({ ...prev, recordDate: newDate }));
                        if (dateError && isValidHistoricalDate(newDate)) {
                          setDateError('');
                        }
                      }}
                      max={SimpleTimezoneFix.toDateString(new Date())}
                      className={inputClass}
                    />
                    {dateError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{dateError}</p>
                    )}
                    {saveError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{saveError}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Notas de la Versión</label>
                    <textarea
                      value={template.notes || ''}
                      onChange={(e) => setField('notes', e.target.value)}
                      placeholder="Describe los cambios o el motivo de esta nueva versión..."
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>

                {/* Evaluación Ortodóncica */}
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-4">
                  {sectionHeader('fa-tooth', 'text-blue-600 dark:text-blue-400', 'Evaluación Ortodóncica')}
                  <div className="space-y-4">
                    {textareaField(
                      'motivoConsultaOrtodoncia',
                      'Motivo de Consulta Ortodóncica:',
                      2,
                      'Describa el motivo principal de la consulta ortodóncica...'
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectField('tipoMordida', 'Tipo de Mordida:', TIPO_MORDIDA_OPTIONS)}
                      {selectField('tipoAparato', 'Tipo de Aparato:', TIPO_APARATO_OPTIONS)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Fecha Inicio Tratamiento:</label>
                        <input
                          type="date"
                          value={(template.fechaInicioTratamiento as string) || ''}
                          onChange={(e) => setField('fechaInicioTratamiento', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Fecha Fin Tratamiento:</label>
                        <input
                          type="date"
                          value={(template.fechaFinTratamiento as string) || ''}
                          onChange={(e) => setField('fechaFinTratamiento', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Duración Estimada (meses):</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={duracionMeses}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            if (!isNaN(value) && value >= 1 && value <= 50) {
                              setField('duracionTratamiento', `${value} meses`);
                            }
                          }}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico y Plan de Tratamiento */}
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20 p-4">
                  {sectionHeader('fa-clipboard-check', 'text-green-600 dark:text-green-400', 'Diagnóstico y Plan de Tratamiento')}
                  <div className="space-y-4">
                    {textareaField(
                      'diagnosticoOrtodoncia',
                      'Diagnóstico Ortodóncico:',
                      3,
                      'Describa el diagnóstico ortodóncico detallado...'
                    )}
                    {textareaField(
                      'planTratamientoOrtodoncia',
                      'Plan de Tratamiento Ortodóncico:',
                      3,
                      'Describa el plan de tratamiento ortodóncico...'
                    )}
                    {textareaField(
                      'observacionesOrtodoncia',
                      'Observaciones Ortodóncicas:',
                      2,
                      'Observaciones adicionales sobre el tratamiento...'
                    )}
                  </div>
                </div>

                {/* Estudios y Análisis */}
                <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4">
                  {sectionHeader('fa-microscope', 'text-purple-600 dark:text-purple-400', 'Estudios y Análisis')}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Radiografías Realizadas:</label>
                        <div className="space-y-2">
                          {RADIOGRAPHIES.map((option) => (
                            <label key={option.value} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={getRadiografias().includes(option.value)}
                                onChange={() => toggleRadiografia(option.value)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {selectField('modelosEstudio', 'Modelos de Estudio:', MODALOS_ESTUDIO_OPTIONS)}
                    </div>
                    {textareaField(
                      'analisisCefalometrico',
                      'Análisis Cefalométrico:',
                      2,
                      'Resultados del análisis cefalométrico...'
                    )}
                    {textareaField(
                      'extraccionesRealizadas',
                      'Extracciones Realizadas:',
                      2,
                      'Describa las extracciones realizadas si aplica...'
                    )}
                  </div>
                </div>

                {/* Retención y Seguimiento */}
                <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20 p-4">
                  {sectionHeader('fa-retweet', 'text-orange-600 dark:text-orange-400', 'Retención y Seguimiento')}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectField('retenedorTipo', 'Tipo de Retenedor Superior:', RETENEDOR_TIPO_OPTIONS)}
                      {selectField('retenedorUso', 'Uso de Retenedor Superior:', RETENEDOR_USO_OPTIONS)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectField('retenedorInferiorTipo', 'Tipo de Retenedor Inferior:', RETENEDOR_TIPO_OPTIONS)}
                      {selectField('retenedorInferiorUso', 'Uso de Retenedor Inferior:', RETENEDOR_USO_OPTIONS)}
                    </div>
                    {textareaField(
                      'seguimientoPostTratamiento',
                      'Seguimiento Post-Tratamiento:',
                      2,
                      'Notas de seguimiento post-tratamiento...'
                    )}
                  </div>
                </div>

                {/* Documentos Ortodóncicos */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-4">
                  {sectionHeader('fa-folder-open', 'text-gray-600 dark:text-gray-400', 'Documentos Ortodóncicos')}
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Subir Documentos:</label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleDocumentUpload}
                        disabled={uploading}
                        className={`${inputClass} cursor-pointer`}
                      />
                      {uploading && (
                        <p className="mt-2 text-sm text-teal-600 dark:text-teal-400 flex items-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></span>
                          Subiendo documentos...
                        </p>
                      )}
                      {uploadError && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                      )}
                      {uploadSuccess && (
                        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {uploadSuccess}
                        </p>
                      )}
                    </div>

                    {(template.documentosOrtodoncia || []).length > 0 ? (
                      <DocumentDisplay
                        documents={template.documentosOrtodoncia || []}
                        patientId={patientId || undefined}
                        removable={true}
                        onRemove={removeDocument}
                      />
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-gray-800/50">
                        <div className="text-gray-400 text-3xl mb-1">📁</div>
                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                          No hay documentos adjuntos en esta versión
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewVersionDialog(false)}
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