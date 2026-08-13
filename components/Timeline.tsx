'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatVersionDisplay, OrthodonticVersion } from '@/utils/versionUtils';
import { getProgressColor, extractMonthsFromDuration } from '@/utils/progressUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';
import DocumentDisplay from './DocumentDisplay';

// Progress shown in cards/modal must match the top ProgressBar: total
// appointments = months of treatment (min 4); fall back to stored values.
const getDisplayProgress = (version: OrthodonticVersion): number => {
  const completed = version.completedAppointments || 0;
  const months = extractMonthsFromDuration(version.duracionTratamiento || '');
  const total = months > 0 ? Math.max(months, 4) : version.totalEstimatedAppointments || 0;
  if (total > 0) return Math.min(Math.round((completed / total) * 100), 100);
  return version.progressPercentage || 0;
};

interface TimelineProps {
  versions: OrthodonticVersion[];
  onVersionSelect: (version: OrthodonticVersion) => void;
  selectedVersionId?: string;
  loading?: boolean;
  onCreateNewVersion?: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  versions,
  onVersionSelect,
  selectedVersionId,
  loading = false,
  onCreateNewVersion
}) => {
  const [hoveredVersion, setHoveredVersion] = useState<string | null>(null);
  const [detailsVersion, setDetailsVersion] = useState<OrthodonticVersion | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Collapse all version cards by default, except the latest one
  useEffect(() => {
    if (versions.length === 0 || initializedRef.current) return;
    initializedRef.current = true;
    const latestId = versions.reduce(
      (max, version) => (version.versionNumber > max.versionNumber ? version : max),
      versions[0]
    ).id;
    setCollapsedIds(new Set(versions.filter((v) => v.id !== latestId).map((v) => v.id)));
  }, [versions]);

  const toggleCollapsed = (versionId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <i className="fas fa-history text-4xl mb-3"></i>
        <p>No hay versiones anteriores</p>
      </div>
    );
  }

  const maxVersionNumber = versions.reduce(
    (max, version) => Math.max(max, version.versionNumber),
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-stream text-teal-600"></i>
          Historial de Versiones
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {versions.length} {versions.length === 1 ? 'versión' : 'versiones'}
        </span>
      </div>
      
      <div className="relative">
        {/* Timeline line - gradient effect */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-500 via-blue-500 to-gray-300 dark:to-gray-600"></div>
        
        {/* Timeline items - stream style */}
        {versions.map((version, index) => {
          const isSelected = selectedVersionId === version.id;
          const isHovered = hoveredVersion === version.id;
          // The "Actual" badge goes to the highest version number
          const isCurrent = version.versionNumber === maxVersionNumber;
          const isExpanded = !collapsedIds.has(version.id);
          
          return (
            <div
              key={version.id}
              className="relative pb-3 group cursor-pointer"
              onClick={() => {
                onVersionSelect(version);
                // Expand the card when selected
                if (collapsedIds.has(version.id)) {
                  setCollapsedIds(prev => {
                    const next = new Set(prev);
                    next.delete(version.id);
                    return next;
                  });
                }
              }}
              onMouseEnter={() => setHoveredVersion(version.id)}
              onMouseLeave={() => setHoveredVersion(null)}
            >
              {/* Timeline node */}
              <div className="absolute left-4 top-4 z-10">
                <div 
                  className={`w-5 h-5 rounded-full border-4 transition-all duration-300 ${
                    isSelected
                      ? 'bg-teal-500 border-teal-100 dark:border-teal-900 scale-125 shadow-lg shadow-teal-500/50'
                      : isCurrent
                      ? 'bg-blue-500 border-blue-100 dark:border-blue-900 shadow-lg shadow-blue-500/50'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 group-hover:border-teal-400 group-hover:scale-110'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                  )}
                </div>
              </div>
              
              {/* Stream card */}
              <div 
                className={`ml-14 transition-all duration-300 ${
                  isHovered && !isSelected ? '-translate-x-1' : ''
                }`}
              >
                <div
                  className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                    isSelected
                      ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-900/30 dark:to-teal-800/10 shadow-lg shadow-teal-500/20'
                      : isCurrent
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/10 shadow-md shadow-blue-500/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md'
                  }`}
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <div className="p-4 relative">
                    {/* Version header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Version badge */}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isCurrent 
                            ? 'bg-blue-600 text-white' 
                            : isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          V{version.versionNumber}
                        </div>
                        
                        {!isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            <i className="fas fa-lock text-xs"></i>
                            Histórica
                          </span>
                        )}
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {formatVersionDisplay(version)}
                            </h4>
                            
                            {isCurrent && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {index === 0 ? 'Más reciente' : `Hace ${index} ${index === 1 ? 'versión' : 'versiones'}`}
                            <CreatorBadge name={version.createdBy} image={version.createdByImage} size="sm" />
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress ring and expand toggle */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="relative w-10 h-10">
                          <svg className="w-10 h-10 transform -rotate-90">
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                              className="text-gray-200 dark:text-gray-700"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                              strokeDasharray={`${getDisplayProgress(version)} 100`}
                              className={`${getProgressColor(getDisplayProgress(version))} transition-all duration-500`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                            {getDisplayProgress(version)}%
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapsed(version.id);
                          }}
                          aria-label={isExpanded ? 'Colapsar versión' : 'Expandir versión'}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 ${
                            isExpanded
                              ? 'border-teal-500 text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:border-teal-600 dark:text-teal-300'
                              : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-teal-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                          }`}
                        >
                          <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                        </button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <>
                    {/* Timeline date info */}
                    <div className="flex flex-wrap gap-4 mt-3">
                      {version.recordDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-teal-100 dark:bg-teal-800/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <i className={`fas fa-calendar-day w-4 text-center ${isSelected ? 'text-teal-600' : ''}`}></i>
                          </div>
                          <span>
                            <span className="font-medium">Registro:</span>{' '}
                            {SimpleTimezoneFix.formatDisplayDate(version.recordDate)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-teal-100 dark:bg-teal-800/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <i className={`fas fa-clock w-4 text-center ${isSelected ? 'text-teal-600' : ''}`}></i>
                        </div>
                        <span>
                          <span className="font-medium">Creado:</span>{' '}
                          {SimpleTimezoneFix.formatDisplayDate(version.createdAt)} {' '}
                          <span className="text-gray-500">{SimpleTimezoneFix.formatTime(version.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Motivo and notes */}
                    {(version.motivoConsultaOrtodoncia || version.notes) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {version.motivoConsultaOrtodoncia && (
                          <div className="mb-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Motivo de consulta
                            </span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {version.motivoConsultaOrtodoncia}
                            </p>
                          </div>
                        )}
                        
                        {version.notes && (
                          <div className="flex items-start gap-2">
                            <i className="fas fa-sticky-note mt-1 text-amber-500"></i>
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              {version.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsVersion(version);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-teal-100 dark:bg-teal-800/50 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-700/50'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <i className="fas fa-eye"></i>
                        Ver detalles
                      </button>
                    </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Version Details Modal */}
      {detailsVersion && (() => {
        const isCurrent = detailsVersion.versionNumber === maxVersionNumber;
        const progress = getDisplayProgress(detailsVersion);
        const hasTreatment = detailsVersion.tipoMordida || detailsVersion.tipoAparato || detailsVersion.duracionTratamiento || detailsVersion.fechaInicioTratamiento || detailsVersion.fechaFinTratamiento;
        const hasStudies = detailsVersion.radiografiasRealizadas || detailsVersion.modelosEstudio || detailsVersion.analisisCefalometrico || detailsVersion.extraccionesRealizadas;
        const hasRetainers = detailsVersion.retenedorTipo || detailsVersion.retenedorInferiorTipo;
        const hasObservations = detailsVersion.observacionesOrtodoncia || detailsVersion.seguimientoPostTratamiento;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className={`px-6 py-5 border-b ${isCurrent ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-700'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-extrabold text-white flex-shrink-0 shadow-lg ${
                      isCurrent ? 'bg-blue-600 shadow-blue-600/30' : 'bg-teal-600 shadow-teal-600/30'
                    }`}>
                      V{detailsVersion.versionNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Versión {detailsVersion.versionNumber}
                        </h3>
                        {isCurrent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
                            Actual
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            <i className="fas fa-lock mr-1 text-xs"></i>
                            Anterior (Solo Lectura)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {detailsVersion.recordDate
                          ? `Registro del ${SimpleTimezoneFix.formatDisplayDate(detailsVersion.recordDate)}`
                          : `Creada el ${SimpleTimezoneFix.formatDisplayDate(detailsVersion.createdAt)}`}
                      </p>
                      <CreatorBadge name={detailsVersion.createdBy} image={detailsVersion.createdByImage} size="md" />
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailsVersion(null)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    aria-label="Cerrar"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* Progress */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Progreso del tratamiento
                    </span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                      style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* General info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {detailsVersion.recordDate && (
                    <InfoCard label="Fecha del Registro" value={SimpleTimezoneFix.formatDisplayDate(detailsVersion.recordDate)} />
                  )}
                  <InfoCard
                    label="Creado"
                    value={`${SimpleTimezoneFix.formatDisplayDate(detailsVersion.createdAt)} · ${SimpleTimezoneFix.formatTime(detailsVersion.createdAt)}`}
                  />
                  {detailsVersion.doctorId && (
                    <InfoCard label="Doctor Tratante" value={detailsVersion.doctorId} />
                  )}
                </div>

                {/* Notas de la Versión */}
                {detailsVersion.notes && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                      <i className="fas fa-sticky-note text-amber-500"></i>
                      Notas de la Versión
                    </h4>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {detailsVersion.notes}
                    </p>
                  </div>
                )}

                {/* Consulta y diagnóstico */}
                {(detailsVersion.motivoConsultaOrtodoncia || detailsVersion.diagnosticoOrtodoncia || detailsVersion.planTratamientoOrtodoncia) && (
                  <section>
                    <SectionHeader icon="fa-stethoscope" title="Consulta y Diagnóstico" />
                    <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl">
                      {detailsVersion.motivoConsultaOrtodoncia && (
                        <InfoRow label="Motivo de consulta" value={detailsVersion.motivoConsultaOrtodoncia} />
                      )}
                      {detailsVersion.diagnosticoOrtodoncia && (
                        <InfoRow label="Diagnóstico" value={detailsVersion.diagnosticoOrtodoncia} />
                      )}
                      {detailsVersion.planTratamientoOrtodoncia && (
                        <InfoRow label="Plan de tratamiento" value={detailsVersion.planTratamientoOrtodoncia} />
                      )}
                    </div>
                  </section>
                )}

                {/* Tratamiento */}
                {hasTreatment && (
                  <section>
                    <SectionHeader icon="fa-braces" title="Tratamiento" />
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl px-4">
                      {detailsVersion.tipoMordida && (
                        <InfoRow label="Tipo de mordida" value={translateMordida(detailsVersion.tipoMordida)} />
                      )}
                      {detailsVersion.tipoAparato && (
                        <InfoRow label="Tipo de aparato" value={translateAparato(detailsVersion.tipoAparato)} />
                      )}
                      {detailsVersion.duracionTratamiento && (
                        <InfoRow label="Duración" value={detailsVersion.duracionTratamiento} />
                      )}
                      {detailsVersion.fechaInicioTratamiento && (
                        <InfoRow label="Fecha de inicio" value={SimpleTimezoneFix.formatDisplayDate(detailsVersion.fechaInicioTratamiento)} />
                      )}
                      {detailsVersion.fechaFinTratamiento && (
                        <InfoRow label="Fecha de fin" value={SimpleTimezoneFix.formatDisplayDate(detailsVersion.fechaFinTratamiento)} />
                      )}
                    </div>
                  </section>
                )}

                {/* Estudios y procedimientos */}
                {hasStudies && (
                  <section>
                    <SectionHeader icon="fa-x-ray" title="Estudios y Procedimientos" />
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl px-4">
                      {detailsVersion.radiografiasRealizadas && (
                        <InfoRow label="Radiografías" value={translateRadiografias(detailsVersion.radiografiasRealizadas)} />
                      )}
                      {detailsVersion.modelosEstudio && (
                        <InfoRow label="Modelos de estudio" value={translateModelos(detailsVersion.modelosEstudio)} />
                      )}
                      {detailsVersion.analisisCefalometrico && (
                        <InfoRow label="Análisis cefalométrico" value={detailsVersion.analisisCefalometrico} />
                      )}
                      {detailsVersion.extraccionesRealizadas && (
                        <InfoRow label="Extracciones" value={detailsVersion.extraccionesRealizadas} />
                      )}
                    </div>
                  </section>
                )}

                {/* Retenedores */}
                {hasRetainers && (
                  <section>
                    <SectionHeader icon="fa-align-left" title="Retenedores" />
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl px-4">
                      {detailsVersion.retenedorTipo && (
                        <InfoRow
                          label="Retenedor superior"
                          value={formatRetainer(detailsVersion.retenedorTipo, detailsVersion.retenedorUso)}
                        />
                      )}
                      {detailsVersion.retenedorInferiorTipo && (
                        <InfoRow
                          label="Retenedor inferior"
                          value={formatRetainer(detailsVersion.retenedorInferiorTipo, detailsVersion.retenedorInferiorUso)}
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* Observaciones */}
                {hasObservations && (
                  <section>
                    <SectionHeader icon="fa-comment-dots" title="Observaciones" />
                    <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl">
                      {detailsVersion.observacionesOrtodoncia && (
                        <InfoRow label="Observaciones del tratamiento" value={detailsVersion.observacionesOrtodoncia} />
                      )}
                      {detailsVersion.seguimientoPostTratamiento && (
                        <InfoRow label="Seguimiento post tratamiento" value={detailsVersion.seguimientoPostTratamiento} />
                      )}
                    </div>
                  </section>
                )}

                {/* Documentos adjuntos */}
                {detailsVersion.documentosOrtodoncia && detailsVersion.documentosOrtodoncia.length > 0 && (
                  <section>
                    <SectionHeader icon="fa-file-medical" title="Documentos Adjuntos" />
                    <div className="mt-2">
                      <DocumentDisplay documents={detailsVersion.documentosOrtodoncia} />
                    </div>
                  </section>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap justify-end gap-3 sticky bottom-0">
                <button
                  onClick={() => setDetailsVersion(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>

                <button
                  onClick={() => {
                    onVersionSelect(detailsVersion);
                    setDetailsVersion(null);
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-edit"></i>
                  Cargar en Formulario
                </button>

                {onCreateNewVersion && (
                  <button
                    onClick={() => {
                      onCreateNewVersion();
                      setDetailsVersion(null);
                    }}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-plus"></i>
                    Crear Nueva Versión
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Shows the user who created a version with their avatar (mirrors notas-linea-de-tiempo)
const CreatorBadge: React.FC<{ name?: string; image?: string; size?: 'sm' | 'md' }> = ({ name, image, size = 'md' }) => {
  if (!name || name === 'current_user') return null;
  const avatarSize = size === 'sm' ? 'w-4 h-4 text-[9px]' : 'w-6 h-6 text-xs';
  const imageSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ${size === 'sm' ? 'ml-1' : 'mt-1'}`}>
      {image ? (
        <img src={image} alt={name} className={`${imageSize} rounded-full object-cover`} />
      ) : (
        <span className={`${avatarSize} rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center`}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="font-medium">{name}</span>
    </span>
  );
};

const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
    <i className={`fas ${icon} text-teal-500 dark:text-teal-400`}></i>
    {title}
  </h4>
);

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200 break-words">
      {value}
    </p>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="py-3 px-4">
    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
      {label}
    </p>
    <p className="mt-0.5 text-sm text-gray-800 dark:text-gray-200 break-words">
      {value}
    </p>
  </div>
);

const MORDIDA_LABELS: Record<string, string> = {
  clase_i: 'Clase I',
  clase_ii: 'Clase II',
  clase_ii_division_1: 'Clase II División 1',
  clase_ii_division_2: 'Clase II División 2',
  clase_iii: 'Clase III',
  mordida_abierta: 'Mordida abierta',
  mordida_abierta_anterior: 'Mordida abierta anterior',
  mordida_abierta_posterior: 'Mordida abierta posterior',
  mordida_cruzada: 'Mordida cruzada',
  mordida_cruzada_anterior: 'Mordida cruzada anterior',
  mordida_cruzada_posterior: 'Mordida cruzada posterior',
  mordida_profunda: 'Mordida profunda',
};

const APARATO_LABELS: Record<string, string> = {
  brackets_metalicos: 'Brackets metálicos',
  brackets_ceramicos: 'Brackets cerámicos',
  brackets_zafiro: 'Brackets de zafiro',
  invisalign: 'Invisalign',
  aparato_removible: 'Aparato removible',
  expansion_palatina: 'Expansión palatina',
  mantenedor_espacio: 'Mantenedor de espacio',
};

const RADIOGRAFIAS_LABELS: Record<string, string> = {
  panoramica: 'Panorámica',
  periapical: 'Periapical',
  oclusal: 'Oclusal',
  lateral_craneo: 'Lateral de cráneo',
  todas: 'Todas',
};

const MODELOS_LABELS: Record<string, string> = {
  si: 'Sí',
  no: 'No',
  en_proceso: 'En proceso',
};

const RETENEDOR_LABELS: Record<string, string> = {
  fijo: 'Fijo',
  removible: 'Removible',
  hawley: 'Hawley',
  invisible: 'Invisible',
  sin_retenedor: 'Sin retenedor',
};

const RETENEDOR_USO_LABELS: Record<string, string> = {
  tiempo_completo: 'Tiempo completo',
  noche: 'Noche',
  ocasional: 'Ocasional',
  no_usa: 'No lo usa',
};

const translateLabel = (value: string, labels: Record<string, string>): string =>
  labels[value] || value;

const translateMordida = (value: string): string => translateLabel(value, MORDIDA_LABELS);
const translateAparato = (value: string): string => translateLabel(value, APARATO_LABELS);
const translateRadiografias = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const parts = Array.isArray(value)
    ? value.map((item) => String(item))
    : String(value).split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.map((part) => translateLabel(part, RADIOGRAFIAS_LABELS)).join(', ');
};
const translateModelos = (value: string): string => translateLabel(value, MODELOS_LABELS);

const formatRetainer = (tipo: string, uso?: string): string => {
  const tipoLabel = translateLabel(tipo, RETENEDOR_LABELS);
  return uso ? `${tipoLabel} · ${translateLabel(uso, RETENEDOR_USO_LABELS)}` : tipoLabel;
};

export default Timeline;
