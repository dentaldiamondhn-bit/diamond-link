'use client';

import { useState, useEffect } from 'react';
import { calculateProgress, extractMonthsFromDuration, calculateEstimatedAppointments, getProgressStatus, getProgressColor } from '@/utils/progressUtils';
import { orthodonticVersionService } from '@/services/orthodonticVersionService';

export interface UseProgressCalculationProps {
  patientId: string;
  duracionTratamiento?: string;
}

export interface ProgressData {
  completedAppointments: number;
  totalEstimatedAppointments: number;
  progressPercentage: number;
  estimatedDuration: number;
  elapsedMonths: number;
  status: string;
  color: string;
  loading: boolean;
  error: string | null;
}

export const useProgressCalculation = ({ 
  patientId, 
  duracionTratamiento 
}: UseProgressCalculationProps): ProgressData => {
  const [progressData, setProgressData] = useState<ProgressData>({
    completedAppointments: 0,
    totalEstimatedAppointments: 12,
    progressPercentage: 0,
    estimatedDuration: extractMonthsFromDuration(duracionTratamiento || '12 meses'),
    elapsedMonths: 0,
    status: 'No iniciado',
    color: 'bg-red-500',
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!patientId) {
        setProgressData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        const versions = await orthodonticVersionService.getVersionsByPatientId(patientId);
        
        // Get the latest version by date (not the isCurrent flag)
        if (versions.length > 0) {
          const sortedVersions = [...versions].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const latestVersion = sortedVersions[0];
          
          // Use latest version's progress data directly
          const estimatedDuration = extractMonthsFromDuration(latestVersion.duracionTratamiento || duracionTratamiento || '12 meses');
          
          setProgressData({
            completedAppointments: latestVersion.completedAppointments || 0,
            totalEstimatedAppointments: latestVersion.totalEstimatedAppointments || 12,
            progressPercentage: latestVersion.progressPercentage || 0,
            estimatedDuration,
            elapsedMonths: 0, // TODO: Calculate from start date
            status: getProgressStatus(latestVersion.progressPercentage || 0),
            color: getProgressColor(latestVersion.progressPercentage || 0),
            loading: false,
            error: null
          });
        } else {
          // No current version, use defaults
          const estimatedDuration = extractMonthsFromDuration(duracionTratamiento || '12 meses');
          const totalEstimatedAppointments = calculateEstimatedAppointments(duracionTratamiento || '12 meses');
          
          setProgressData({
            completedAppointments: 0,
            totalEstimatedAppointments,
            progressPercentage: 0,
            estimatedDuration,
            elapsedMonths: 0,
            status: 'No iniciado',
            color: 'bg-red-500',
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Error fetching progress data:', error);
        setProgressData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load progress data'
        }));
      }
    };

    fetchProgressData();
  }, [patientId, duracionTratamiento]);

  return progressData;
};
