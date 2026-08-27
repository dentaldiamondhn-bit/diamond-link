'use client';

import React, { useEffect, useRef } from 'react';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export interface DeepLinkRoutes {
  patient: string;
  appointment: string;
  doctor: string;
  report: string;
  treatment: string;
}

export class DeepLinkService {
  private static instance: DeepLinkService;
  private router: any;

  private constructor() {}

  static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  // Set router instance (for web navigation)
  setRouter(router: any): void {
    this.router = router;
  }

  // Check if running on native platform
  isNative(): boolean {
    try {
      return Capacitor.isNativePlatform();
    } catch (error) {
      console.warn('⚠️ Capacitor not available, assuming web platform:', error);
      return false;
    }
  }

  // Open patient record via deep link
  async openPatientRecord(patientId: string): Promise<void> {
    try {
      if (this.isNative()) {
        const deepLink = `diamondlink://patient/${patientId}`;
        await AppLauncher.openUrl({ url: deepLink });
        console.log('📱 Opened patient record (Capacitor):', patientId);
      } else {
        // Web navigation
        if (this.router) {
          this.router.push(`/menu-navegacion?id=${patientId}`);
        } else {
          window.location.href = `/menu-navegacion?id=${patientId}`;
        }
        console.log('🌐 Opened patient record (Web):', patientId);
      }
    } catch (error) {
      console.error('❌ Failed to open patient record:', error);
    }
  }

  // Open appointment via deep link
  async openAppointment(appointmentId: string): Promise<void> {
    try {
      if (this.isNative()) {
        const deepLink = `diamondlink://appointment/${appointmentId}`;
        await AppLauncher.openUrl({ url: deepLink });
        console.log('📱 Opened appointment (Capacitor):', appointmentId);
      } else {
        // Web navigation
        if (this.router) {
          this.router.push(`/appointments?id=${appointmentId}`);
        } else {
          window.location.href = `/appointments?id=${appointmentId}`;
        }
        console.log('🌐 Opened appointment (Web):', appointmentId);
      }
    } catch (error) {
      console.error('❌ Failed to open appointment:', error);
    }
  }

  // Open doctor profile via deep link
  async openDoctorProfile(doctorId: string): Promise<void> {
    try {
      if (this.isNative()) {
        const deepLink = `diamondlink://doctor/${doctorId}`;
        await AppLauncher.openUrl({ url: deepLink });
        console.log('📱 Opened doctor profile (Capacitor):', doctorId);
      } else {
        // Web navigation
        if (this.router) {
          this.router.push(`/doctor-profile?id=${doctorId}`);
        } else {
          window.location.href = `/doctor-profile?id=${doctorId}`;
        }
        console.log('🌐 Opened doctor profile (Web):', doctorId);
      }
    } catch (error) {
      console.error('❌ Failed to open doctor profile:', error);
    }
  }

  // Open report via deep link
  async openReport(reportId: string, patientId?: string): Promise<void> {
    try {
      const url = patientId ? `/reports?id=${reportId}&patientId=${patientId}` : `/reports?id=${reportId}`;
      
      if (this.isNative()) {
        const deepLink = `diamondlink://report/${reportId}${patientId ? `?patientId=${patientId}` : ''}`;
        await AppLauncher.openUrl({ url: deepLink });
        console.log('📱 Opened report (Capacitor):', reportId);
      } else {
        // Web navigation
        if (this.router) {
          this.router.push(url);
        } else {
          window.location.href = url;
        }
        console.log('🌐 Opened report (Web):', reportId);
      }
    } catch (error) {
      console.error('❌ Failed to open report:', error);
    }
  }

  // Open treatment plan via deep link
  async openTreatmentPlan(treatmentId: string, patientId: string): Promise<void> {
    try {
      if (this.isNative()) {
        const deepLink = `diamondlink://treatment/${treatmentId}?patientId=${patientId}`;
        await AppLauncher.openUrl({ url: deepLink });
        console.log('📱 Opened treatment plan (Capacitor):', treatmentId);
      } else {
        // Web navigation
        if (this.router) {
          this.router.push(`/treatment-plan?id=${treatmentId}&patientId=${patientId}`);
        } else {
          window.location.href = `/treatment-plan?id=${treatmentId}&patientId=${patientId}`;
        }
        console.log('🌐 Opened treatment plan (Web):', treatmentId);
      }
    } catch (error) {
      console.error('❌ Failed to open treatment plan:', error);
    }
  }

  // Generate shareable deep link
  generateShareLink(type: keyof DeepLinkRoutes, id: string, additionalParams?: Record<string, string>): string {
    const baseUrl = this.isNative() ? 'diamondlink://' : window.location.origin;
    
    let link = `${baseUrl}${type}/${id}`;
    
    if (additionalParams) {
      const params = new URLSearchParams(additionalParams);
      link += `?${params.toString()}`;
    }
    
    return link;
  }

  // Parse incoming deep link
  parseDeepLink(url: string): { type: string; id: string; params: Record<string, string> } | null {
    try {
      const urlObj = new URL(url);
      
      // Check if it's a Diamond Link deep link
      if (urlObj.protocol === 'diamondlink:' || urlObj.hostname === 'diamondlink') {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (pathParts.length >= 2) {
          const type = pathParts[0];
          const id = pathParts[1];
          
          // Parse query parameters
          const params: Record<string, string> = {};
          urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
          });
          
          return { type, id, params };
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse deep link:', error);
    }
    
    return null;
  }

  // Handle incoming deep link (for native app)
  async handleIncomingDeepLink(url: string): Promise<void> {
    const parsed = this.parseDeepLink(url);
    
    if (!parsed) {
      console.warn('⚠️ Invalid deep link format:', url);
      return;
    }

    const { type, id, params } = parsed;

    switch (type) {
      case 'patient':
        await this.openPatientRecord(id);
        break;
      case 'appointment':
        await this.openAppointment(id);
        break;
      case 'doctor':
        await this.openDoctorProfile(id);
        break;
      case 'report':
        await this.openReport(id, params.patientId);
        break;
      case 'treatment':
        await this.openTreatmentPlan(id, params.patientId || '');
        break;
      default:
        console.warn('⚠️ Unknown deep link type:', type);
    }
  }

  // Share patient record
  async sharePatientRecord(patientId: string, patientName?: string): Promise<void> {
    try {
      const shareLink = this.generateShareLink('patient', patientId);
      const shareText = patientName 
        ? `Ver ficha de ${patientName} en Diamond Link: ${shareLink}`
        : `Ver ficha del paciente en Diamond Link: ${shareLink}`;

      if (this.isNative()) {
        // Use native sharing (if available)
        if ('share' in navigator) {
          await navigator.share({
            title: 'Diamond Link - Ficha de Paciente',
            text: shareText,
            url: shareLink
          });
        } else {
          // Fallback: copy to clipboard
          await this.copyToClipboard(shareLink);
        }
      } else {
        // Web sharing
        await this.copyToClipboard(shareLink);
      }
      
      console.log('📤 Shared patient record:', patientId);
    } catch (error) {
      console.error('❌ Failed to share patient record:', error);
    }
  }

  // Copy to clipboard helper
  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 Copied to clipboard:', text);
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
    }
  }
}

// React Hook for using deep links
export const useDeepLinks = () => {
  const router = useRouter();
  const serviceRef = useRef(DeepLinkService.getInstance());

  useEffect(() => {
    const service = serviceRef.current;
    try {
      service.setRouter(router);
    } catch (error) {
      console.warn('⚠️ Failed to set router in DeepLink service:', error);
    }
  }, [router]);

  const openPatientRecord = async (patientId: string) => {
    const service = serviceRef.current;
    await service.openPatientRecord(patientId);
  };

  const openAppointment = async (appointmentId: string) => {
    const service = serviceRef.current;
    await service.openAppointment(appointmentId);
  };

  const openDoctorProfile = async (doctorId: string) => {
    const service = serviceRef.current;
    await service.openDoctorProfile(doctorId);
  };

  const openReport = async (reportId: string, patientId?: string) => {
    const service = serviceRef.current;
    await service.openReport(reportId, patientId);
  };

  const sharePatientRecord = async (patientId: string, patientName?: string) => {
    const service = serviceRef.current;
    await service.sharePatientRecord(patientId, patientName);
  };

  const generateShareLink = (type: keyof DeepLinkRoutes, id: string, additionalParams?: Record<string, string>) => {
    const service = serviceRef.current;
    return service.generateShareLink(type, id, additionalParams);
  };

  return {
    openPatientRecord,
    openAppointment,
    openDoctorProfile,
    openReport,
    sharePatientRecord,
    generateShareLink
  };
};

export default DeepLinkService;
