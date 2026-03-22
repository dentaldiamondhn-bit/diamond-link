'use client';

import React, { useState } from 'react';
import { formatVersionDisplay, OrthodonticVersion } from '@/utils/versionUtils';
import { getProgressColor } from '@/utils/progressUtils';
import { SimpleTimezoneFix } from '@/services/simpleTimezoneFix';

interface TimelineProps {
  versions: OrthodonticVersion[];
  onVersionSelect: (version: OrthodonticVersion) => void;
  selectedVersionId?: string;
  loading?: boolean;
}

const Timeline: React.FC<TimelineProps> = ({
  versions,
  onVersionSelect,
  selectedVersionId,
  loading = false
}) => {
  const [hoveredVersion, setHoveredVersion] = useState<string | null>(null);

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
          // Show "Actual" badge on the most recent version (first in the list)
          const isCurrent = index === 0;
          
          return (
            <div
              key={version.id}
              className="relative pb-4 group cursor-pointer"
              onClick={() => onVersionSelect(version)}
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
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
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
                        
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {formatVersionDisplay(version)}
                        </h4>
                        
                        {isCurrent && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
                            Actual
                          </span>
                        )}
                      </div>
                      
                      {/* Progress ring */}
                      <div className="flex items-center gap-2">
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
                              strokeDasharray={`${version.progressPercentage} 100`}
                              className={`${getProgressColor(version.progressPercentage)} transition-all duration-500`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                            {version.progressPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timeline date info */}
                    <div className="flex flex-wrap gap-4 mb-3">
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
                      {!isCurrent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-600'
                          }`}
                        >
                          <i className="fas fa-check-circle"></i>
                          Hacer actual
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVersionSelect(version);
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
                      
                      {/* Timestamp badge */}
                      <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                        {index === 0 ? 'Más reciente' : `Hace ${index} ${index === 1 ? 'versión' : 'versiones'}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
