// Simple timezone fix that actually works
// This addresses the one-day-behind issue directly

export class SimpleTimezoneFix {
  private static readonly CLINIC_TIMEZONE = 'America/Tegucigalpa';
  
  /**
   * Convert database date to local display - SIMPLE VERSION
   * Uses UTC methods to correctly handle stored timestamps
   */
  static toLocalDate(dateString: string | Date): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Use UTC components to avoid local timezone offset issues
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      return typeof dateString === 'string' ? dateString : '';
    }
  }
  
  /**
   * Format date for display in Spanish - SIMPLE VERSION
   * Uses UTC methods to correctly handle stored timestamps
   */
  static formatDisplayDate(dateString: string | Date): string {
    if (!dateString) return 'No especificada';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Get UTC date components to avoid local timezone offset issues
      const day = date.getUTCDate();
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const month = monthNames[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      
      return `${day} de ${month} ${year}`;
    } catch (error) {
      return 'No especificada';
    }
  }
  
  /**
   * Format date for "Edad al momento de consulta" display (DD/MM/YYYY format)
   * Uses UTC methods to correctly handle stored timestamps
   */
  static formatDateForConsultationAge(dateString: string | Date): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Use UTC date components to avoid local timezone offset issues
      // Format as DD/MM/YYYY
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return typeof dateString === 'string' ? dateString : '';
    }
  }
  
  /**
   * Calculate age correctly - Uses UTC methods
   */
  static calculateAge(birthDateString: string): number {
    if (!birthDateString) return 0;
    
    try {
      const birthDate = new Date(birthDateString);
      const today = new Date();
      
      // Use UTC components to avoid local timezone offset issues
      const birthYear = birthDate.getUTCFullYear();
      const todayYear = today.getUTCFullYear();
      const birthMonth = birthDate.getUTCMonth();
      const todayMonth = today.getUTCMonth();
      const birthDay = birthDate.getUTCDate();
      const todayDay = today.getUTCDate();
      
      let age = todayYear - birthYear;
      const monthDiff = todayMonth - birthMonth;
      
      if (monthDiff < 0 || (monthDiff === 0 && todayDay < birthDay)) {
        age--;
      }
      
      return age;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Format time for display - SIMPLE VERSION
   * Handles UTC timestamps correctly
   */
  static formatTime(dateString: string | Date): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Get UTC time components to avoid local timezone offset issues
      const utcHours = date.getUTCHours();
      const utcMinutes = date.getUTCMinutes();
      
      // Convert to 12-hour format
      let hours = utcHours;
      const minutes = utcMinutes;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      
      const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      
      return `${hours}:${formattedMinutes} ${ampm}`;
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Calculate age at a specific date (for "Edad al momento de consulta")
   * Uses UTC methods to avoid timezone issues
   */
  static calculateAgeAtDate(birthDateString: string, consultationDateString: string): number {
    if (!birthDateString || !consultationDateString) return 0;
    
    try {
      const birthDate = new Date(birthDateString);
      const consultationDate = new Date(consultationDateString);
      
      // Use UTC components to avoid local timezone offset issues
      const birthYear = birthDate.getUTCFullYear();
      const consultYear = consultationDate.getUTCFullYear();
      const birthMonth = birthDate.getUTCMonth();
      const consultMonth = consultationDate.getUTCMonth();
      const birthDay = birthDate.getUTCDate();
      const consultDay = consultationDate.getUTCDate();
      
      let age = consultYear - birthYear;
      const monthDiff = consultMonth - birthMonth;
      
      if (monthDiff < 0 || (monthDiff === 0 && consultDay < birthDay)) {
        age--;
      }
      
      return age;
    } catch (error) {
      return 0;
    }
  }
}
