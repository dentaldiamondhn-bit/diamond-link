'use client';

import React from 'react';
import { getProgressColor, getProgressStatus } from '@/utils/progressUtils';

interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  showLabel = true,
  showStatus = true,
  size = 'md',
  animated = true
}) => {
  const progressColor = getProgressColor(percentage);
  const statusText = getProgressStatus(percentage);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  return (
    <div className="w-full space-y-2">
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className={`font-medium ${labelSizeClasses[size]}`}>
            Progreso del Tratamiento
          </span>
          <span className={`font-bold ${labelSizeClasses[size]} ${
            percentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
          }`}>
            {percentage}%
          </span>
        </div>
      )}
      
      <div className="relative">
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}>
          <div
            className={`${progressColor} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out ${
              animated ? 'animate-pulse' : ''
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            {/* Removed white overlay to fix color display */}
          </div>
        </div>
        
        {/* Progress markers */}
        <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none">
          {[25, 50, 75].map((marker) => (
            <div
              key={marker}
              className="w-0.5 h-2 bg-gray-400 dark:bg-gray-600 opacity-50"
              style={{ marginLeft: `${marker}%` }}
            />
          ))}
        </div>
      </div>
      
      {showStatus && (
        <div className="text-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            percentage === 100 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            {statusText}
          </span>
        </div>
      )}
      
      {/* Progress milestones */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

export default ProgressBar;
