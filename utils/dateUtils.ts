/**
 * Date utilities for consistent date handling across the application
 * Handles timezone issues and provides consistent formatting
 */

/**
 * Formats a date string for display, handling timezone issues
 * @param dateString - Date string from database (YYYY-MM-DD format)
 * @param options - Formatting options
 * @returns Formatted date string in local timezone
 */
export const formatDateForDisplay = (
  dateString: string | Date | null | undefined,
  options: {
    format?: 'short' | 'long' | 'numeric';
    includeTime?: boolean;
  } = {}
): string => {
  if (!dateString) return '';
  
  try {
    let date: Date;
    
    if (typeof dateString === 'string') {
      // Parse the date string - treat it as local date (not UTC)
      const dateStr = dateString.trim();
      const [year, month, day] = dateStr.split('-').map(Number);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // Create date in local timezone (not UTC) to avoid timezone offset issues
        date = new Date(year, month - 1, day);
      } else {
        // Fallback for other date formats
        date = new Date(dateStr);
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const { format = 'short', includeTime = false } = options;
    
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'numeric' ? '2-digit' : format === 'short' ? 'short' : 'long',
      day: '2-digit',
      ...(includeTime && {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
    
    return date.toLocaleDateString('es-HN', dateOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString);
  }
};

/**
 * Formats a date for database storage (YYYY-MM-DD format)
 * @param date - Date object or string
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateForDatabase = (date: Date | string): string => {
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Use UTC to ensure consistent format
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for database:', error);
    return '';
  }
};

/**
 * Gets today's date in YYYY-MM-DD format for database storage
 * @returns Today's date in YYYY-MM-DD format
 */
export const getTodayForDatabase = (): string => {
  return formatDateForDatabase(new Date());
};

/**
 * Checks if a date is today in the local timezone
 * @param dateString - Date string to check
 * @returns True if the date is today
 */
export const isToday = (dateString: string): boolean => {
  const today = getTodayForDatabase();
  return formatDateForDatabase(dateString) === today;
};

/**
 * Gets the difference in days between two dates
 * @param date1 - First date
 * @param date2 - Second date (defaults to today)
 * @returns Number of days difference
 */
export const getDaysDifference = (
  date1: string | Date,
  date2: string | Date = new Date()
): number => {
  try {
    const d1 = new Date(formatDateForDatabase(date1));
    const d2 = new Date(formatDateForDatabase(date2));
    
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating days difference:', error);
    return 0;
  }
};
