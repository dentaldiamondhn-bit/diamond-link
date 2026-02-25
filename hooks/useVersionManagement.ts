'use client';

import { useState, useEffect } from 'react';
import { OrthodonticVersion, sortVersionsByDate, getCurrentVersion, getNextVersionNumber } from '@/utils/versionUtils';
import { extractMonthsFromDuration } from '@/utils/progressUtils';
import { orthodonticVersionService } from '@/services/orthodonticVersionService';

export interface UseVersionManagementProps {
  patientId: string;
}

export interface VersionManagementData {
  versions: OrthodonticVersion[];
  currentVersion: OrthodonticVersion | null;
  selectedVersion: OrthodonticVersion | null;
  loading: boolean;
  error: string | null;
  actions: {
    loadVersions: () => Promise<void>;
    selectVersion: (version: OrthodonticVersion) => void;
    createNewVersion: (recordDate: Date, notes: string) => Promise<void>;
    updateCurrentVersion: (versionData: Partial<OrthodonticVersion>) => Promise<void>;
    makeVersionCurrent: (versionId: string) => Promise<void>;
    refreshVersions: () => Promise<void>;
  };
}

export const useVersionManagement = ({ patientId }: UseVersionManagementProps): VersionManagementData => {
  const [versions, setVersions] = useState<OrthodonticVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<OrthodonticVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = async () => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedVersions = await orthodonticVersionService.getVersionsByPatientId(patientId);
      const sortedVersions = sortVersionsByDate(fetchedVersions);
      setVersions(sortedVersions);
      
      // Auto-select current version
      const current = getCurrentVersion(sortedVersions);
      if (current && !selectedVersion) {
        setSelectedVersion(current);
      }
    } catch (err) {
      console.error('Error loading versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const selectVersion = (version: OrthodonticVersion) => {
    setSelectedVersion(version);
  };

  const createNewVersion = async (recordDate: Date, notes: string) => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the latest version by date (not the isCurrent flag)
      const sortedVersions = sortVersionsByDate(versions);
      const latestVersion = sortedVersions[0];
      
      // Auto-increment completed appointments for new versions
      const currentCompleted = latestVersion?.completedAppointments || 0;
      const newCompleted = currentCompleted + 1;
      
      // Calculate progress based on actual treatment data
      const versionData = latestVersion ? {
        motivoConsultaOrtodoncia: latestVersion.motivoConsultaOrtodoncia,
        diagnosticoOrtodoncia: latestVersion.diagnosticoOrtodoncia,
        planTratamientoOrtodoncia: latestVersion.planTratamientoOrtodoncia,
        tipoMordida: latestVersion.tipoMordida,
        tipoAparato: latestVersion.tipoAparato,
        duracionTratamiento: latestVersion.duracionTratamiento,
        fechaInicioTratamiento: latestVersion.fechaInicioTratamiento,
        fechaFinTratamiento: latestVersion.fechaFinTratamiento,
        observacionesOrtodoncia: latestVersion.observacionesOrtodoncia,
        radiografiasRealizadas: latestVersion.radiografiasRealizadas,
        modelosEstudio: latestVersion.modelosEstudio,
        analisisCefalometrico: latestVersion.analisisCefalometrico,
        extraccionesRealizadas: latestVersion.extraccionesRealizadas,
        retenedorTipo: latestVersion.retenedorTipo,
        retenedorUso: latestVersion.retenedorUso,
        seguimientoPostTratamiento: latestVersion.seguimientoPostTratamiento,
        documentosOrtodoncia: latestVersion.documentosOrtodoncia,
        firmaDigitalOrtodoncia: latestVersion.firmaDigitalOrtodoncia,
        // Auto-increment completed appointments
        completedAppointments: newCompleted,
        totalEstimatedAppointments: latestVersion.totalEstimatedAppointments || 12
      } : {
        // First version - start with 1 completed appointment
        completedAppointments: 1,
        totalEstimatedAppointments: 12
      };
      
      const newVersion = await orthodonticVersionService.createVersion(
        patientId,
        {
          ...versionData,
          recordDate: recordDate.toISOString().split('T')[0],
          notes
        },
        false // Don't make new versions current by default
      );
      
      // Refresh versions
      await loadVersions();
    } catch (err) {
      console.error('Error creating new version:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new version');
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentVersion = async (versionData: Partial<OrthodonticVersion>) => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentVersions = await orthodonticVersionService.getVersionsByPatientId(patientId);
      const currentVersion = currentVersions.find(v => v.isCurrent);
      
      if (!currentVersion) {
        // No current version exists, create the first one
        console.log('No current version found, creating first version...');
        await orthodonticVersionService.createVersion(patientId, {
          ...versionData,
          progressPercentage: 0,
          completedAppointments: 0,
          totalEstimatedAppointments: 12
        }, true);
        return;
      }
      
      // Calculate progress based on actual treatment data (duration and completed appointments)
      const duracionTratamiento = versionData.duracionTratamiento || currentVersion.duracionTratamiento || '12 meses';
      const totalEstimatedAppointments = Math.max(extractMonthsFromDuration(duracionTratamiento), 4);
      const completedAppointments = versionData.completedAppointments !== undefined 
        ? versionData.completedAppointments 
        : currentVersion.completedAppointments || 0;
      
      // Calculate actual progress percentage
      const progressPercentage = totalEstimatedAppointments > 0 
        ? Math.min(Math.round((completedAppointments / totalEstimatedAppointments) * 100), 100)
        : 0;
      
      // Update existing current version by creating a new one with calculated progress
      await orthodonticVersionService.createVersion(patientId, {
        ...currentVersion,
        ...versionData,
        progressPercentage,
        completedAppointments,
        totalEstimatedAppointments
      }, true);
    } catch (err) {
      console.error('Error updating current version:', err);
      setError(err instanceof Error ? err.message : 'Failed to update current version');
    } finally {
      setLoading(false);
    }
  };

  const makeVersionCurrent = async (versionId: string) => {
    if (!patientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await orthodonticVersionService.makeVersionCurrent(patientId, versionId);
      await loadVersions();
    } catch (err) {
      console.error('Error making version current:', err);
      setError(err instanceof Error ? err.message : 'Failed to make version current');
    } finally {
      setLoading(false);
    }
  };

  const refreshVersions = async () => {
    await loadVersions();
  };

  useEffect(() => {
    loadVersions();
  }, [patientId]);

  const currentVersion = getCurrentVersion(versions);

  return {
    versions,
    currentVersion,
    selectedVersion,
    loading,
    error,
    actions: {
      loadVersions,
      selectVersion,
      createNewVersion,
      updateCurrentVersion,
      makeVersionCurrent,
      refreshVersions
    }
  };
};
