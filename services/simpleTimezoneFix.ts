// Simple timezone fix that actually works
// This addresses the one-day-behind issue directly

export class SimpleTimezoneFix {
  private static readonly CLINIC_TIMEZONE = 'America/Tegucigalpa';
  
  /**
   * Convert database date to local display - SIMPLE VERSION
   * This directly fixes the one-day-behind issue
   */
  static toLocalDate(dateString: string | Date): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Create date in local timezone by adding timezone offset
      const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      // Format as YYYY-MM-DD in local timezone
      const year = utcDate.getFullYear();
      const month = String(utcDate.getMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error in toLocalDate:', error);
      return typeof dateString === 'string' ? dateString : '';
    }
  }
  
  /**
   * Format date for display in Spanish - SIMPLE VERSION
   */
  static formatDisplayDate(dateString: string | Date): string {
    if (!dateString) return 'No especificada';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Get local date components
      const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      const day = localDate.getDate();
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const month = monthNames[localDate.getMonth()];
      const year = localDate.getFullYear();
      
      return `${day} de ${month} ${year}`;
    } catch (error) {
      console.error('Error in formatDisplayDate:', error);
      return 'No especificada';
    }
  }
  
  /**
   * Format date for "Edad al momento de consulta" display (DD/MM/YYYY format)
   * This fixes the one-day-behind issue for consultation age
   */
  static formatDateForConsultationAge(dateString: string | Date): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Get local date components
      const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      // Format as DD/MM/YYYY
      const day = String(localDate.getDate()).padStart(2, '0');
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const year = localDate.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error in formatDateForConsultationAge:', error);
      return typeof dateString === 'string' ? dateString : '';
    }
  }
  
  /**
   * Calculate age correctly - SIMPLE VERSION
   */
  static calculateAge(birthDateString: string): number {
    if (!birthDateString) return 0;
    
    try {
      const birthDate = new Date(birthDateString);
      const today = new Date();
      
      // Adjust for timezone
      const localBirthDate = new Date(birthDate.getTime() + birthDate.getTimezoneOffset() * 60000);
      const localToday = new Date(today.getTime() + today.getTimezoneOffset() * 60000);
      
      let age = localToday.getFullYear() - localBirthDate.getFullYear();
      const monthDiff = localToday.getMonth() - localBirthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && localToday.getDate() < localBirthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 0;
    }
  }
  
  /**
   * Calculate age at a specific date (for "Edad al momento de consulta")
   */
  static calculateAgeAtDate(birthDateString: string, consultationDateString: string): number {
    if (!birthDateString || !consultationDateString) return 0;
    
    try {
      const birthDate = new Date(birthDateString);
      const consultationDate = new Date(consultationDateString);
      
      // Adjust for timezone
      const localBirthDate = new Date(birthDate.getTime() + birthDate.getTimezoneOffset() * 60000);
      const localConsultationDate = new Date(consultationDate.getTime() + consultationDate.getTimezoneOffset() * 60000);
      
      let age = localConsultationDate.getFullYear() - localBirthDate.getFullYear();
      const monthDiff = localConsultationDate.getMonth() - localBirthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && localConsultationDate.getDate() < localBirthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age at date:', error);
      return 0;
    }
  }
}
