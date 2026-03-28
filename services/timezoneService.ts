// Global timezone service for consistent date/time handling across the application
import { supabase } from '../lib/supabase';

export interface TimezoneConfig {
  default_timezone: string;
  timezone_offset: string;
  clinic_timezone: string;
}

export class TimezoneService {
  private static config: TimezoneConfig | null = null;

  // Load timezone configuration from database
  static async loadConfig(): Promise<TimezoneConfig> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .in('key', ['default_timezone', 'timezone_offset', 'clinic_timezone'])
        .single();

      if (error) {
        console.error('Error loading timezone config:', error);
        // Fallback to Honduras timezone
        return {
          default_timezone: 'America/Tegucigalpa',
          timezone_offset: '-06:00',
          clinic_timezone: 'America/Tegucigalpa'
        };
      }

      const config: TimezoneConfig = {
        default_timezone: data?.default_timezone || 'America/Tegucigalpa',
        timezone_offset: data?.timezone_offset || '-06:00',
        clinic_timezone: data?.clinic_timezone || 'America/Tegucigalpa'
      };

      this.config = config;
      return config;
    } catch (error) {
      console.error('Unexpected error loading timezone config:', error);
      return {
        default_timezone: 'America/Tegucigalpa',
        timezone_offset: '-06:00',
        clinic_timezone: 'America/Tegucigalpa'
      };
    }
  }

  // Convert local date to UTC for database storage
  static toUTC(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Use the configured timezone
    const timezone = this.config?.clinic_timezone || 'America/Tegucigalpa';
    
    // Create date in clinic timezone
    const clinicDate = new Date(dateObj.toLocaleString('en-US', { 
      timeZone: timezone 
    }));
    
    // Convert to ISO string for database storage
    return clinicDate.toISOString();
  }

  // Convert UTC date from database to local timezone for display
  static toLocal(date: string | Date): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Use the configured timezone
    const timezone = this.config?.clinic_timezone || 'America/Tegucigalpa';
    
    // Convert UTC date to local timezone
    return new Date(dateObj.toLocaleString('en-US', { 
      timeZone: timezone 
    }));
  }

  // Get current timezone offset
  static getTimezoneOffset(): string {
    return this.config?.timezone_offset || '-06:00';
  }

  // Format date for display in local timezone
  static formatForDisplay(date: Date | string, format: string = 'yyyy-MM-dd HH:mm'): string {
    const localDate = this.toLocal(date);
    
    // Simple date formatting
    const d = new Date(localDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return format
      .replace('yyyy', String(year))
      .replace('MM', month)
      .replace('dd', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  }

  // Initialize timezone service
  static async initialize(): Promise<void> {
    await this.loadConfig();
  }
}

export default TimezoneService;
