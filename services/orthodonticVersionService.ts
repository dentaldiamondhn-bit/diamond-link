import { OrthodonticVersion, getNextVersionNumber } from '@/utils/versionUtils';
import { extractMonthsFromDuration } from '@/utils/progressUtils';

export class OrthodonticVersionService {
  private calculateProgressPercentage(
    completedAppointments: number,
    totalEstimatedAppointments: number
  ): number {
    if (totalEstimatedAppointments <= 0) return 0;
    return Math.min(Math.round((completedAppointments / totalEstimatedAppointments) * 100), 100);
  }

  private calculateTotalEstimatedAppointments(duracionTratamiento?: string): number {
    if (!duracionTratamiento) return 12; // default
    return Math.max(extractMonthsFromDuration(duracionTratamiento), 4); // minimum 4 appointments
  }
  async getVersionsByPatientId(patientId: string): Promise<OrthodonticVersion[]> {
    try {
      const response = await fetch(`/api/orthodontic-versions?patientId=${encodeURIComponent(patientId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.versions || [];
    } catch (error) {
      console.error('Error fetching orthodontic versions:', error);
      throw error;
    }
  }

  async createVersion(
    patientId: string,
    versionData: Partial<OrthodonticVersion>,
    isCurrent: boolean = false
  ): Promise<OrthodonticVersion> {
    try {
      const currentVersions = await this.getVersionsByPatientId(patientId);
      const nextVersionNumber = getNextVersionNumber(currentVersions);
      
      const response = await fetch('/api/orthodontic-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          versionNumber: nextVersionNumber,
          isCurrent,
          ...versionData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Full DB Error:', errorData);
        throw new Error(`Failed to create version: ${errorData.details || errorData.error}`);
      }
      
      const data = await response.json();
      return data.version;
    } catch (error) {
      console.error('Error creating orthodontic version:', error);
      throw error;
    }
  }

  async updateCurrentVersion(
    patientId: string,
    versionData: Partial<OrthodonticVersion>
  ): Promise<void> {
    try {
      const currentVersions = await this.getVersionsByPatientId(patientId);
      const currentVersion = currentVersions.find(v => v.isCurrent);
      
      if (!currentVersion) {
        // No current version exists, create first one
        console.log('No current version found, creating first version...');
        await this.createVersion(patientId, versionData, true);
        return;
      }
      
      // Update existing current version in place
      const response = await fetch('/api/orthodontic-versions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          originalVersionId: currentVersion.id,
          ...versionData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Full DB Error on Update:', errorData);
        throw new Error(`Failed to update current version: ${errorData.details || errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating current orthodontic version:', error);
      throw error;
    }
  }

  async makeVersionCurrent(
    patientId: string,
    versionId: string
  ): Promise<void> {
    try {
      const response = await fetch(`/api/orthodontic-versions/${versionId}/make-current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to make version current: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error making version current:', error);
      throw error;
    }
  }

  async deleteVersion(versionId: string): Promise<void> {
    try {
      const response = await fetch(`/api/orthodontic-versions/${versionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete version: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting orthodontic version:', error);
      throw error;
    }
  }

  async getVersionProgress(patientId: string): Promise<{
    completedAppointments: number;
    totalEstimatedAppointments: number;
    progressPercentage: number;
  }> {
    try {
      const versions = await this.getVersionsByPatientId(patientId);
      const currentVersion = versions.find(v => v.isCurrent);
      
      if (!currentVersion) {
        // No versions exist yet, return default values
        console.log('No versions found for patient, returning default progress');
        return {
          completedAppointments: 0,
          totalEstimatedAppointments: 12,
          progressPercentage: 0
        };
      }
      
      return {
        completedAppointments: currentVersion.completedAppointments || 0,
        totalEstimatedAppointments: currentVersion.totalEstimatedAppointments || 12,
        progressPercentage: currentVersion.progressPercentage || 0
      };
    } catch (error) {
      console.error('Error getting version progress:', error);
      // Return default values on error
      return {
        completedAppointments: 0,
        totalEstimatedAppointments: 12,
        progressPercentage: 0
      };
    }
  }
}

export const orthodonticVersionService = new OrthodonticVersionService();
