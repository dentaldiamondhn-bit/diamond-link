// Service to handle timezone conversions properly
// This fixes the one-day-behind issue with dates

export class TimezoneFixService {
  private static readonly CLINIC_TIMEZONE = 'America/Tegucigalpa';
  
  /**
   * Convert a date from database (UTC) to local timezone display
   * This fixes the one-day-behind issue
   */
  static toLocalDate(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Format in local timezone (Honduras)
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.CLINIC_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }
  
  /**
   * Convert a date from local input to database storage (UTC)
   * This ensures dates are stored correctly in UTC
   */
  static toDatabaseDate(dateString: string): string {
    // Parse the local date and convert to UTC for storage
    const localDate = new Date(dateString + 'T00:00:00');
    return localDate.toISOString();
  }
  
  /**
   * Format date for display in local timezone (Spanish)
   */
  static formatDisplayDate(dateString: string | Date): string {
    if (!dateString) return 'No especificada';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Format in local timezone (Honduras) with Spanish month names
      return new Intl.DateTimeFormat('es-HN', {
        timeZone: this.CLINIC_TIMEZONE,
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'No especificada';
    }
  }
  
  /**
   * Format datetime for display in local timezone
   */
  static formatDisplayDateTime(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    return new Intl.DateTimeFormat('es-HN', {
      timeZone: this.CLINIC_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  /**
   * Calculate age correctly considering timezone
   * This uses local timezone for accurate age calculation
   */
  static calculateAge(birthDateString: string): number {
    if (!birthDateString) return 0;
    
    try {
      // Parse the birth date as UTC (how it's stored in database)
      const birthDateUTC = new Date(birthDateString);
      
      // Get current date in local timezone
      const today = new Date();
      
      // Calculate age using local timezone components
      let age = today.getFullYear() - birthDateUTC.getFullYear();
      
      // Adjust for whether birthday has occurred this year
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();
      const birthMonth = birthDateUTC.getMonth();
      const birthDay = birthDateUTC.getDate();
      
      if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 0;
    }
  }
  
  /**
   * Get current date in local timezone for database storage
   */
  static getCurrentLocalDateForStorage(): string {
    return new Date().toISOString();
  }
  
  /**
   * Get current date in local timezone for display
   */
  static getCurrentLocalDateForDisplay(): string {
    return this.toLocalDate(new Date());
  }
  
  /**
   * Format date for HTML date input (YYYY-MM-DD format)
   * This ensures proper format for date inputs
   */
  static formatDateForInput(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Format as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Format datetime for HTML datetime-local input
   * This ensures proper format for datetime inputs
   */
  static formatDateTimeForInput(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Format as YYYY-MM-DDTHH:mm in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
