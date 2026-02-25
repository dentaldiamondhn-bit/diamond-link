'use client';

import React, { useState } from 'react';
import { formatVersionDisplay, OrthodonticVersion } from '@/utils/versionUtils';
import { getProgressColor } from '@/utils/progressUtils';

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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Historial de Versiones
      </h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
        
        {/* Timeline items */}
        {versions.map((version, index) => {
          const isSelected = selectedVersionId === version.id;
          const isHovered = hoveredVersion === version.id;
          const isCurrent = version.isCurrent;
          
          return (
            <div
              key={version.id}
              className="relative flex items-start space-x-4 pb-6 group cursor-pointer"
              onClick={() => onVersionSelect(version)}
              onMouseEnter={() => setHoveredVersion(version.id)}
              onMouseLeave={() => setHoveredVersion(null)}
            >
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-teal-600 border-teal-600 scale-125'
                      : isCurrent
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  } ${
                    isHovered ? 'scale-110' : ''
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  )}
                </div>
              </div>
              
              {/* Version card */}
              <div
                className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 shadow-lg'
                    : isCurrent
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                } ${
                  isHovered ? 'shadow-md transform -translate-y-0.5' : ''
                }`}
              >
                {/* Version header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {formatVersionDisplay(version)}
                    </h4>
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Actual
                      </span>
                    )}
                  </div>
                  
                  {/* Progress indicator */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full ${getProgressColor(version.progressPercentage)}`}
                      ></div>
                      <span className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {version.progressPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Version details */}
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {version.recordDate && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-calendar-alt w-4"></i>
                      <span>
                        Fecha del registro: {new Date(version.recordDate).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-clock w-4"></i>
                    <span>
                      Creado: {new Date(version.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  {version.notes && (
                    <div className="flex items-start space-x-2 mt-2">
                      <i className="fas fa-sticky-note w-4 mt-0.5"></i>
                      <span className="italic">{version.notes}</span>
                    </div>
                  )}
                  
                  {version.motivoConsultaOrtodoncia && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Motivo: {version.motivoConsultaOrtodoncia}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-2 mt-3">
                  {!isCurrent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle make current
                      }}
                      className="text-xs px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                    >
                      <i className="fas fa-check mr-1"></i>
                      Hacer actual
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle view details
                    }}
                    className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    <i className="fas fa-eye mr-1"></i>
                    Ver detalles
                  </button>
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
